/**
 * Static payout multipliers for each of the 13 bins (symmetric).
 *
 * Bin layout (0 = leftmost edge, 12 = rightmost edge):
 *   [0]  [1]  [2]  [3]  [4]  [5]  [6]  [7]  [8]  [9]  [10] [11] [12]
 *
 * Edge bins pay the most; center bins pay the least.
 * The house edge is baked in (sum of weighted payouts < 1 per unit bet).
 */
export const PAYOUT_MULTIPLIERS: readonly number[] = [
  10.0, // bin 0  (far left)
  4.0,  // bin 1
  2.5,  // bin 2
  1.5,  // bin 3
  1.0,  // bin 4
  0.5,  // bin 5
  0.3,  // bin 6  (center)
  0.5,  // bin 7
  1.0,  // bin 8
  1.5,  // bin 9
  2.5,  // bin 10
  4.0,  // bin 11
  10.0, // bin 12 (far right)
] as const;

/**
 * Returns the payout multiplier for the given bin index.
 * Clamps to valid range defensively.
 */
export function getPayoutMultiplier(binIndex: number): number {
  const clamped = Math.max(0, Math.min(PAYOUT_MULTIPLIERS.length - 1, binIndex));
  return PAYOUT_MULTIPLIERS[clamped];
}
