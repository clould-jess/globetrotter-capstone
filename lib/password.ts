import argon2 from "argon2";

// Argon2id is the current OWASP-recommended default: resistant to both
// GPU-cracking (unlike bcrypt/scrypt in some configs) and side-channel
// timing attacks (unlike plain Argon2i for this use case).
const HASH_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB, OWASP minimum recommendation
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, HASH_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Malformed hash, etc. Fail closed.
    return false;
  }
}

// NIST 800-63B style: enforce length, not arbitrary complexity rules.
// Complexity rules (must have symbol! must have number!) push users toward
// predictable substitutions and don't meaningfully increase entropy.
export function isPasswordAcceptable(plain: string): boolean {
  return typeof plain === "string" && plain.length >= 10 && plain.length <= 256;
}
