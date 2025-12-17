import dotenv from "dotenv";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val)).default(3000),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  API_VERSION: z.enum(["v1"]).default("v1"),
  X402_FACILITATOR_URL: z.url(),
});

dotenv.config();

export const env = envSchema.parse(process.env);