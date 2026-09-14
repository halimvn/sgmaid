import "server-only";
import bcrypt from "bcryptjs";
import { BCRYPT_SALT_ROUNDS, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./constants";

/**
 * Password hashing — Phase 2.
 *
 * Using bcryptjs (a pure-JS bcrypt implementation) rather than native
 * `bcrypt` or Argon2: it needs no native build toolchain (no node-gyp/
 * Python/Visual Studio Build Tools), which matters on a Windows dev
 * machine and keeps `npm install` reliable on Vercel's build image too.
 * bcrypt is still a well-established, appropriately slow password hash
 * for this project's scale — there's no need for Argon2's extra tuning
 * complexity here.
 *
 * Never log a plaintext password or a hash.
 */

export function isPasswordLengthValid(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}
