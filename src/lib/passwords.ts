import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [scheme, salt, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hashHex) return false;
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, 'hex');
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}
