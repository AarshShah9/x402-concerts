import request from "supertest";
import { Server } from "http";
import app from "../../src/app";
import { env } from "../../src/lib/env";
import {
  makePaidRequest,
  getPaymentReceipt,
} from "../helpers/x402-client";
import { checkWalletBalances, isWalletConfigured } from "../helpers/x402-wallet";
import * as readline from "readline";

// Helper function to wait for user confirmation during OAuth flow
const waitForUserConfirmation = (message: string): Promise<void> => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
};

describe("x402 Payment Integration Tests", () => {
  let server: Server;

  beforeAll((done) => {
    // Start the server before running tests
    server = app.listen(3001, () => {
      console.log(`Test server running on port 3001`);
      done();
    });
  });

  afterAll((done) => {
    // Close the server after tests complete
    server.close(done);
  });

  describe("Payment Required (402) Responses", () => {
    it("should return 402 Payment Required for /test endpoint without payment", async () => {
      const response = await request(app).get("/api/v1/concert/test");

      expect(response.status).toBe(402);
      expect(response.headers["payment-required"]).toBeDefined();
    });

    it("should return 402 Payment Required for /concerts endpoint without payment", async () => {
      const response = await request(app).get("/api/v1/concert");

      expect(response.status).toBe(402);
      expect(response.headers["payment-required"]).toBeDefined();
    });

    it("should include correct payment details in PAYMENT-REQUIRED header", async () => {
      const response = await request(app).get("/api/v1/concert/test");

      expect(response.status).toBe(402);

      const paymentHeader = response.headers["payment-required"];
      expect(paymentHeader).toBeDefined();

      // Decode the base64-encoded JSON payload
      const paymentData = JSON.parse(
        Buffer.from(paymentHeader, "base64").toString("utf-8"),
      );

      // Verify x402 v2 structure
      expect(paymentData.x402Version).toBe(2);
      expect(paymentData.error).toBe("Payment required");
      expect(paymentData.resource).toBeDefined();
      expect(paymentData.resource.description).toBe("Test route");
      expect(paymentData.accepts).toBeDefined();
      expect(paymentData.accepts.length).toBeGreaterThan(0);

      // Verify payment details
      const acceptedPayment = paymentData.accepts[0];
      expect(acceptedPayment.scheme).toBe("exact");
      expect(acceptedPayment.network).toBe(env.X402_NETWORK);
      expect(acceptedPayment.payTo).toBe(env.X402_PAY_TO);
    });
  });

  describe("Payment Details Validation", () => {
    it("should parse PAYMENT-REQUIRED header correctly", async () => {
      const response = await request(app).get("/api/v1/concert/test");

      const paymentHeader = response.headers["payment-required"];
      expect(paymentHeader).toBeTruthy();

      // Decode and parse the base64-encoded JSON
      const paymentData = JSON.parse(
        Buffer.from(paymentHeader, "base64").toString("utf-8"),
      );

      // Verify structure
      expect(paymentData).toHaveProperty("x402Version");
      expect(paymentData).toHaveProperty("error");
      expect(paymentData).toHaveProperty("resource");
      expect(paymentData).toHaveProperty("accepts");
      expect(Array.isArray(paymentData.accepts)).toBe(true);
    });
  });

  describe("Endpoint Availability", () => {
    it("should have /test endpoint configured", async () => {
      const response = await request(app).get("/api/v1/concert/test");
      expect(response.status).toBe(402);
    });

    it("should have /concerts endpoint configured", async () => {
      const response = await request(app).get("/api/v1/concert");
      expect(response.status).toBe(402);
    });
  });

  describe("Full Payment Flow (E2E)", () => {
    beforeAll(async () => {
      const { isValid, message } = isWalletConfigured();
      if (!isValid) {
        console.log(message);
        throw new Error(message);
      }
      const walletBalances = await checkWalletBalances();
      if (walletBalances.ethBalance === 0 || walletBalances.usdcBalance === 0) {
        throw new Error(`Wallet has no balance: ${walletBalances?.ethBalance} ETH, ${walletBalances?.usdcBalance} USDC`);
      }
    });

    it("should complete payment and access /test endpoint", async () => {
        const response = await makePaidRequest(
          "http://localhost:3001/api/v1/concert/test",
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty("message");
        expect(data.message).toBe("Test route");
      }, 30000);

    it("should include payment receipt in response headers", async () => {
        const response = await makePaidRequest(
          "http://localhost:3001/api/v1/concert/test",
        );

        expect(response.status).toBe(200);

        // Check for payment-related headers
        const paymentResponse = response.headers.get("payment-response");
        expect(paymentResponse).toBeDefined();

        // Try to parse payment receipt
        const receipt = getPaymentReceipt(response);
        expect(receipt).toBeDefined();
      }, 30000);

    it("should complete payment and access concerts endpoint", async () => {
      // Step 1: Initialize the link session
      const initResponse = await request(app)
        .post("/api/v1/link/init")
        .send({
          provider: "SPOTIFY",
          client_type: "AI_AGENT"
        });

      expect(initResponse.status).toBe(200);
      const { auth_url, link_session_token } = initResponse.body;
      expect(auth_url).toBeDefined();
      expect(link_session_token).toBeDefined();

      // Step 2: Display the OAuth URL and wait for user to complete login
      console.log("SPOTIFY OAUTH REQUIRED\nPlease open the following URL in your browser to authorize Spotify:\n" + auth_url + "\n" + "Press Enter to continue...");
      await waitForUserConfirmation("");

      // Step 3: Make the paid request to the concerts endpoint with the session token
      const concertsUrl = `http://localhost:3001/api/v1/concert/?link_session_token=${link_session_token}&lat=40.7590167&lng=-73.9896861&radius_km=500&start_date=2025-01-01&end_date=2027-12-31&limit=25`;
      const response = await makePaidRequest(concertsUrl);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      console.log("Concerts data received:", data);
      expect(data).toBeDefined();
    }, 120000); // Increased timeout to 2 minutes for manual OAuth
  });
});
