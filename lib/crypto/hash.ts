import { createHash, randomBytes } from "crypto";

/**
 * Returns the SHA-256 hex digest of the given string.
 */
export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Generates a cryptographically secure random server seed (32 bytes = 64 hex chars).
 */
export function generateServerSeed(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Generates a cryptographically secure nonce as a random numeric string.
 * Uses 4 bytes → 0..4294967295, then converts to string.
 */
export function generateNonce(): string {
  return randomBytes(4).readUInt32BE(0).toString();
}

/**
 * Builds the commit hex that is shown to the player BEFORE the game starts.
 * commitHex = SHA256(serverSeed + ":" + nonce)
 */
export function buildCommitHex(serverSeed: string, nonce: string): string {
  return sha256(`${serverSeed}:${nonce}`);
}

/**
 * Builds the combined seed used for the PRNG.
 * combinedSeed = SHA256(serverSeed + ":" + clientSeed + ":" + nonce)
 */
export function buildCombinedSeed(
  serverSeed: string,
  clientSeed: string,
  nonce: string
): string {
  return sha256(`${serverSeed}:${clientSeed}:${nonce}`);
}
