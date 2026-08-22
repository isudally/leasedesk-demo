import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;
const PREFIX = "scrypt";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${PREFIX}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [prefix, salt, hash] = storedHash.split(":");
  if (prefix !== PREFIX || !salt || !hash) {
    return false;
  }

  const stored = Buffer.from(hash, "hex");
  const candidate = scryptSync(password, salt, stored.length);

  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}

export function isPasswordHash(value: string) {
  return value.startsWith(`${PREFIX}:`);
}
