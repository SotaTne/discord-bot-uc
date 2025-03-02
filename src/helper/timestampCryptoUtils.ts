import crypto from "crypto";

const KEY = Buffer.from("0123456789abcdef0123456789abcdef", "hex"); // 128bit (16 bytes) fixed key
const IV = Buffer.from("fedcba9876543210fedcba9876543210", "hex"); // 128bit (16 bytes) fixed IV

const ALGORITHM = "aes-128-cbc"; // 128bit AES encryption (CBC mode)

export function encodeUnixTimestamp(timestamp: number): string {
  const timestampStr = timestamp.toString();

  const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV);
  let encrypted = cipher.update(timestampStr, "utf8", "hex");
  encrypted += cipher.final("hex");

  return encrypted;
}

export function decodeUnixTimestamp(encryptedData: string): number {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return parseInt(decrypted, 10);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getEncodedNow(): string {
  return encodeUnixTimestamp(Math.floor(Date.now() / 1000));
}
