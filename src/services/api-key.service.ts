import { createHash, randomBytes } from "crypto";
import { API_KEY_PREFIX, API_KEY_RANDOM_BYTES, API_KEY_MAX_PER_USER } from "@/constants";

/**
 * API Key Service — handles key generation, hashing, and validation.
 *
 * Key format: straw_sk_<64 hex chars from 32 random bytes>
 * Only the SHA-256 hash is stored. The plaintext is returned once at creation.
 */

export interface GeneratedApiKey {
  /** The full plaintext key — shown to the user once, never stored */
  plaintext: string;
  /** SHA-256 hash of the plaintext — this is what gets stored */
  hash: string;
  /** First 16 chars of the key for display/identification */
  prefix: string;
}

/**
 * Generate a new API key.
 * Returns the plaintext (to show to the user) and the hash (to store in DB).
 */
export function generateApiKey(): GeneratedApiKey {
  const randomHex = randomBytes(API_KEY_RANDOM_BYTES).toString("hex");
  const plaintext = `${API_KEY_PREFIX}${randomHex}`;
  const hash = hashApiKey(plaintext);
  const prefix = plaintext.slice(0, 16);

  return { plaintext, hash, prefix };
}

/**
 * Hash an API key for storage/lookup.
 * Uses SHA-256 — fast enough for per-request lookup, collision-resistant.
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Validate that a string looks like a Straw API key.
 */
export function isValidApiKeyFormat(key: string): boolean {
  // straw_sk_ (9 chars) + 64 hex chars = 73 total
  return key.startsWith(API_KEY_PREFIX) && key.length === API_KEY_PREFIX.length + API_KEY_RANDOM_BYTES * 2;
}

/**
 * Maximum API keys per user.
 */
export { API_KEY_MAX_PER_USER };
