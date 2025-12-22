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
  X402_FACILITATOR_URL: z.url().default("https://facilitator.x402.com"),
  X402_PAY_TO: z.string().default("0x0000000000000000000000000000000000000000"),
  X402_NETWORK: z
    .enum(["base:mainnet", "base:testnet"])
    .default("base:mainnet"),
  X402_PRICE: z.number().default(0.01),
  X402_SCHEME: z.enum(["exact:evm"]).default("exact:evm"),
  TICKETMASTER_API_URL: z.url().default("https://app.ticketmaster.com"),
  TICKETMASTER_API_KEY: z.string(),
  SECRET_KEY: z.string().length(32),
});

dotenv.config();

export const env = envSchema.parse(process.env);
