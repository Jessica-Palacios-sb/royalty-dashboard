import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

/**
 * Hash de contraseña con scrypt (sin dependencias externas).
 * Formato almacenado: "<salt-hex>:<hash-hex>".
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const test = scryptSync(password, salt, 64);
  if (hashBuf.length !== test.length) return false;
  return timingSafeEqual(hashBuf, test);
}
