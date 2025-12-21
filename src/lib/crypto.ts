// crypto.ts
import crypto from "crypto";
import { env } from "./env";

export function hash(token: string): string {
  return crypto
    .createHmac("sha256", env.SESSION_TOKEN_SECRET)
    .update(token)
    .digest("hex");
}

export function encryptToken(plaintext: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", env.SECRET_KEY, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptToken(enc: { ciphertext: string; iv: string; tag: string }) {
  const iv = Buffer.from(enc.iv, "base64");
  const tag = Buffer.from(enc.tag, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", env.SECRET_KEY, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(enc.ciphertext, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
