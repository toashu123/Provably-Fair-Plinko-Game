/**
 * XorShift32 PRNG — deterministic, fast, seedable.
 *
 * Algorithm: https://en.wikipedia.org/wiki/Xorshift
 * Period: 2^32 - 1 (never 0)
 *
 * Usage:
 *   const prng = new XorShift32(seedFromHex(combinedSeed));
 *   const value = prng.rand(); // float in [0, 1)
 */
export class XorShift32 {
  private state: number;

  constructor(seed: number) {
    // XorShift requires non-zero seed; fall back to 1 if somehow 0
    this.state = seed >>> 0 || 1;
  }

  /**
   * Advance state and return the next 32-bit unsigned integer.
   */
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    // Force unsigned 32-bit
    this.state = x >>> 0;
    return this.state;
  }

  /**
   * Returns a float in [0, 1) by dividing by 2^32.
   */
  rand(): number {
    return this.next() / 0x100000000;
  }
}

/**
 * Derives the XorShift32 seed from the first 4 bytes of a hex string (big-endian).
 *
 * @param hexStr - A hex-encoded string (e.g. the combinedSeed digest)
 * @returns A 32-bit unsigned integer suitable as the PRNG seed
 */
export function seedFromHex(hexStr: string): number {
  // Take the first 8 hex characters = 4 bytes
  const slice = hexStr.slice(0, 8);
  // Parse as big-endian 32-bit unsigned integer
  return parseInt(slice, 16) >>> 0;
}
