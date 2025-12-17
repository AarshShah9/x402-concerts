import dotenv from "dotenv";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val)).default(3000),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
});

dotenv.config();

export const env = envSchema.parse(process.env);