import dotenv from "dotenv";
import { z } from "zod";

const envSchema = z.object({
  PORT: z
    .string()
    .transform((val) => parseInt(val))
    .default(3000),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  API_VERSION: z.enum(["v1"]).default("v1"),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/x402-concerts"),
  SERVER_URL: z.url().default("http://localhost:3000"),
  SPOTIFY_CLIENT_ID: z.string(),
  SPOTIFY_CLIENT_SECRET: z.string(),
  SPOTIFY_API_URL: z.url().default("https://api.spotify.com/v1"),
  SPOTIFY_AUTHORIZATION_URL: z.url().default("https://accounts.spotify.com"),
  SPOTIFY_REDIRECT_URI: z
    .url()
    .default("http://localhost:3000/api/v1/link/callback"),
  SESSION_TOKEN_SECRET: z.string().min(32),
  X402_FACILITATOR_URL: z.url().default("https://x402.org/facilitator"),
  X402_PAY_TO: z.string().default("0x0000000000000000000000000000000000000000"),
  X402_NETWORK: z.enum(["eip155:8453", "eip155:84532"]).default("eip155:84532"),
  X402_PRICE: z.string().default("$0.01"),
  X402_SCHEME: z.enum(["exact"]).default("exact"),
  TICKETMASTER_API_URL: z.url().default("https://app.ticketmaster.com"),
  TICKETMASTER_API_KEY: z.string(),
  SECRET_KEY: z.string().length(32),
  FEED_SYNC_COUNTRIES: z.string().default("US,CA"),
  FEED_SYNC_SCHEDULE: z.string().default("0 */6 * * *"),
  FEED_EVENT_RETENTION_DAYS_PAST: z.coerce.number().default(90),
  FEED_EVENT_RETENTION_MONTHS_FUTURE: z.coerce.number().default(18),
  // Test-only variables
  TEST_WALLET_PRIVATE_KEY: z.string().optional(),
});

dotenv.config();

export const env = envSchema.parse(process.env);
