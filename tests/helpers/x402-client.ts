import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { env } from "../../src/lib/env";

// Singleton client instance to maintain state across requests
let clientInstance: {
  client: x402Client;
  fetchWithPayment: (url: string, options?: RequestInit) => Promise<Response>;
  httpClient: x402HTTPClient;
} | null = null;

/**
 * Create an x402 client configured for testing
 * This client automatically handles payment flows
 * Uses singleton pattern to maintain state across requests
 */
export function createX402Client(): {
  client: x402Client;
  fetchWithPayment: (url: string, options?: RequestInit) => Promise<Response>;
  httpClient: x402HTTPClient;
} {
  // Return existing instance if already created
  if (clientInstance) {
    return clientInstance;
  }

  // Create signer from private key
  const signer = privateKeyToAccount(
    env.TEST_WALLET_PRIVATE_KEY as `0x${string}`,
  );

  // Create x402 client
  const client = new x402Client();

  // Register EVM payment scheme for Base Sepolia
  registerExactEvmScheme(client as any, { signer });

  // Create payment-enabled fetch wrapper
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  // Create HTTP client for payment response parsing
  const httpClient = new x402HTTPClient(client);

  // Cache the instance
  clientInstance = {
    client,
    fetchWithPayment,
    httpClient,
  };

  return clientInstance;
}

/**
 * Make a paid request to a protected endpoint
 * This automatically handles the full payment flow:
 * 1. Initial request → 402 response
 * 2. Parse payment details
 * 3. Send USDC payment on-chain
 * 4. Get payment proof from facilitator
 * 5. Retry request with payment signature
 * 6. Return successful response
 */
export async function makePaidRequest(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const { fetchWithPayment } = createX402Client();

  // Ensure we have proper request options with all required fields
  const requestOptions: RequestInit = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...((options?.headers as Record<string, string>) || {}),
    },
    ...options,
  };

  try {
    return await fetchWithPayment(url, requestOptions);
  } catch (error) {
    console.error("Error during paid request:", error);
    throw error;
  }
}

/**
 * Get payment receipt from response headers
 */
export function getPaymentReceipt(response: Response): any | null {
  const { httpClient } = createX402Client();

  try {
    const paymentResponse = httpClient.getPaymentSettleResponse((name) =>
      response.headers.get(name),
    );
    return paymentResponse;
  } catch (error) {
    return null;
  }
}
