import { XorShift32, seedFromHex } from "@/lib/prng/xorshift32";
import {
  sha256,
  buildCommitHex,
  buildCombinedSeed,
} from "@/lib/crypto/hash";
import { getPayoutMultiplier } from "@/lib/engine/payouts";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Move = "L" | "R";

export interface PegEntry {
  /** Raw leftBias before dropColumn adjustment, rounded to 6 decimals */
  leftBias: number;
}

/** pegMap[row][col] where col goes 0..row (triangle shape) */
export type PegMap = PegEntry[][];

export interface EngineResult {
  /** Peg map used for this round */
  pegMap: PegMap;
  /** SHA-256 of JSON.stringify(pegMap) */
  pegMapHash: string;
  /** L/R decisions per row */
  path: Move[];
  /** Final bin index (number of RIGHT moves made) */
  binIndex: number;
  /** Payout multiplier for the final bin */
  payoutMultiplier: number;
  /** The combined seed hex digest */
  combinedSeed: string;
  /** The commit hex (before game) */
  commitHex: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const ROWS = 12;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Clamps a number to [min, max].
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Rounds a number to N decimal places.
 */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

/**
 * Builds the peg map using the PRNG in its CURRENT state.
 *
 * For rows=12 there are rows pegs per row (each peg gets a leftBias).
 * The peg map is a 2D array: pegMap[row][pegIndex]
 *
 * Each peg: leftBias = 0.5 + (rand() - 0.5) * 0.2  → range [0.4, 0.6]
 * Rounded to 6 decimal places.
 *
 * IMPORTANT: The PRNG state is advanced here. Call buildPegMap BEFORE runDrop.
 */
export function buildPegMap(rows: number, prng: XorShift32): PegMap {
  const pegMap: PegMap = [];
  for (let row = 0; row < rows; row++) {
    // Each row has (row + 1) pegs in a triangle layout
    const rowPegs: PegEntry[] = [];
    for (let col = 0; col <= row; col++) {
      const r = prng.rand();
      const leftBias = roundTo(0.5 + (r - 0.5) * 0.2, 6);
      rowPegs.push({ leftBias });
    }
    pegMap.push(rowPegs);
  }
  return pegMap;
}

/**
 * Simulates the ball drop through the peg map.
 *
 * pos = number of RIGHT moves taken so far (starts at 0).
 * At each row, the ball hits peg at position `pos` (in the row).
 *
 * dropColumn adjustment:
 *   adj = (dropColumn - floor(rows / 2)) * 0.01
 *   bias' = clamp(leftBias + adj, 0, 1)
 *
 * Decision:
 *   if rand() < bias' → LEFT (pos stays)
 *   else              → RIGHT (pos++)
 *
 * Final: binIndex = pos
 *
 * IMPORTANT: Call AFTER buildPegMap (PRNG must be in correct state).
 */
export function runDrop(
  pegMap: PegMap,
  dropColumn: number,
  prng: XorShift32
): { path: Move[]; binIndex: number } {
  const rows = pegMap.length;
  const adj = (dropColumn - Math.floor(rows / 2)) * 0.01;
  const path: Move[] = [];
  let pos = 0;

  for (let row = 0; row < rows; row++) {
    const peg = pegMap[row][pos];
    const biasAdjusted = clamp(peg.leftBias + adj, 0, 1);
    const r = prng.rand();

    if (r < biasAdjusted) {
      path.push("L");
      // pos stays
    } else {
      path.push("R");
      pos++;
    }
  }

  return { path, binIndex: pos };
}

/**
 * Full pipeline: given the three seeds + dropColumn, produce all derived values.
 *
 * Order:
 *   1. commitHex  = SHA256(serverSeed + ":" + nonce)
 *   2. combinedSeed = SHA256(serverSeed + ":" + clientSeed + ":" + nonce)
 *   3. PRNG seeded from first 4 bytes of combinedSeed
 *   4. buildPegMap  (advances PRNG)
 *   5. runDrop      (advances PRNG further)
 *   6. pegMapHash   = SHA256(JSON.stringify(pegMap))
 *   7. payoutMultiplier from binIndex
 */
export function computeAll(
  serverSeed: string,
  clientSeed: string,
  nonce: string,
  dropColumn: number,
  rows: number = ROWS
): EngineResult {
  const commitHex = buildCommitHex(serverSeed, nonce);
  const combinedSeed = buildCombinedSeed(serverSeed, clientSeed, nonce);

  const seed = seedFromHex(combinedSeed);
  const prng = new XorShift32(seed);

  // Step 1: build peg map (consumes PRNG first)
  const pegMap = buildPegMap(rows, prng);
  const pegMapHash = sha256(JSON.stringify(pegMap));

  // Step 2: run drop (consumes PRNG second)
  const { path, binIndex } = runDrop(pegMap, dropColumn, prng);

  const payoutMultiplier = getPayoutMultiplier(binIndex);

  return {
    pegMap,
    pegMapHash,
    path,
    binIndex,
    payoutMultiplier,
    combinedSeed,
    commitHex,
  };
}
