import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

/** Password hashes are versioned so the work factor can be upgraded later. */
export async function hashPassword(password: string, minimumLength = 12): Promise<string> {
  if (password.length < minimumLength || Buffer.byteLength(password, "utf8") > 1024)
    throw new Error("Invalid password length");
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt-v1:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  if (Buffer.byteLength(password, "utf8") > 1024) return false;
  const match = /^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(encoded);
  if (!match) return false;
  const expected = Buffer.from(match[2], "hex");
  const actual = (await scrypt(
    password,
    Buffer.from(match[1], "hex"),
    expected.length,
  )) as Buffer;
  return timingSafeEqual(actual, expected);
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
