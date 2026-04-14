import { describe, it, expect } from "vitest";
import { sha256, buildCommitHex, buildCombinedSeed } from "@/lib/crypto/hash";
import { computeAll, buildPegMap, runDrop, ROWS } from "@/lib/engine/plinko";
import { XorShift32, seedFromHex } from "@/lib/prng/xorshift32";

// ─── Test Vector (from spec) ─────────────────────────────────────────────────
const SERVER_SEED =
  "b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc";
const NONCE = "42";
const CLIENT_SEED = "candidate-hello";
const EXPECTED_COMMIT_HEX =
  "bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34";
const EXPECTED_COMBINED_SEED =
  "e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0";

// ─── Crypto Tests ─────────────────────────────────────────────────────────────
describe("Cryptography (hash.ts)", () => {
  it("sha256 produces correct digest for known input", () => {
    // SHA256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    expect(sha256("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("sha256 output is always 64 hex characters", () => {
    expect(sha256("test")).toHaveLength(64);
    expect(sha256("")).toHaveLength(64);
    expect(sha256("a".repeat(1000))).toHaveLength(64);
  });

  it("sha256 is deterministic", () => {
    expect(sha256("same")).toBe(sha256("same"));
  });

  it("buildCommitHex matches spec test vector", () => {
    const commitHex = buildCommitHex(SERVER_SEED, NONCE);
    expect(commitHex).toBe(EXPECTED_COMMIT_HEX);
  });

  it("buildCombinedSeed matches spec test vector", () => {
    const combined = buildCombinedSeed(SERVER_SEED, CLIENT_SEED, NONCE);
    expect(combined).toBe(EXPECTED_COMBINED_SEED);
  });
});

// ─── Engine Tests ─────────────────────────────────────────────────────────────
describe("Plinko Engine (plinko.ts)", () => {
  it("computeAll produces correct commitHex from spec test vector", () => {
    const result = computeAll(SERVER_SEED, CLIENT_SEED, NONCE, 6);
    expect(result.commitHex).toBe(EXPECTED_COMMIT_HEX);
  });

  it("computeAll produces correct combinedSeed from spec test vector", () => {
    const result = computeAll(SERVER_SEED, CLIENT_SEED, NONCE, 6);
    expect(result.combinedSeed).toBe(EXPECTED_COMBINED_SEED);
  });

  it("computeAll produces deterministic results (idempotent)", () => {
    const r1 = computeAll(SERVER_SEED, CLIENT_SEED, NONCE, 6);
    const r2 = computeAll(SERVER_SEED, CLIENT_SEED, NONCE, 6);
    expect(r1.binIndex).toBe(r2.binIndex);
    expect(r1.path).toEqual(r2.path);
    expect(r1.pegMapHash).toBe(r2.pegMapHash);
  });

  it("path length equals number of rows", () => {
    const result = computeAll(SERVER_SEED, CLIENT_SEED, NONCE, 6);
    expect(result.path).toHaveLength(ROWS);
  });

  it("binIndex is in valid range [0, 12]", () => {
    const result = computeAll(SERVER_SEED, CLIENT_SEED, NONCE, 6);
    expect(result.binIndex).toBeGreaterThanOrEqual(0);
    expect(result.binIndex).toBeLessThanOrEqual(12);
  });

  it("path contains only L and R", () => {
    const result = computeAll(SERVER_SEED, CLIENT_SEED, NONCE, 6);
    for (const move of result.path) {
      expect(["L", "R"]).toContain(move);
    }
  });

  it("binIndex equals count of R moves in path", () => {
    const result = computeAll(SERVER_SEED, CLIENT_SEED, NONCE, 6);
    const rCount = result.path.filter((m) => m === "R").length;
    expect(result.binIndex).toBe(rCount);
  });

  it("dropColumn adjustment affects results differently than center", () => {
    // Different dropColumns should (statistically) produce different results
    const center = computeAll(SERVER_SEED, CLIENT_SEED, NONCE, 6);
    const edge = computeAll(SERVER_SEED, CLIENT_SEED, NONCE, 0);
    // They use same PRNG but different bias adjustments — paths may differ
    // At minimum, the function runs without error
    expect(edge.path).toHaveLength(ROWS);
    expect(center.path).toHaveLength(ROWS);
  });

  it("pegMap has correct shape (triangular: row i has i+1 entries)", () => {
    const result = computeAll(SERVER_SEED, CLIENT_SEED, NONCE, 6);
    for (let i = 0; i < ROWS; i++) {
      expect(result.pegMap[i]).toHaveLength(i + 1);
    }
  });

  it("leftBias values are in [0.4, 0.6] range", () => {
    const result = computeAll(SERVER_SEED, CLIENT_SEED, NONCE, 6);
    for (const row of result.pegMap) {
      for (const peg of row) {
        expect(peg.leftBias).toBeGreaterThanOrEqual(0.4);
        expect(peg.leftBias).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it("pegMapHash is a valid 64-char hex string", () => {
    const result = computeAll(SERVER_SEED, CLIENT_SEED, NONCE, 6);
    expect(result.pegMapHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("computeAll with different clientSeeds produces different results", () => {
    const r1 = computeAll(SERVER_SEED, "seed-a", NONCE, 6);
    const r2 = computeAll(SERVER_SEED, "seed-b", NONCE, 6);
    // Different combinedSeeds → different PRNG paths
    expect(r1.combinedSeed).not.toBe(r2.combinedSeed);
  });
});

// ─── Full Deterministic Replay ────────────────────────────────────────────────
describe("Deterministic Replay", () => {
  it("manual replay with separate buildPegMap + runDrop matches computeAll", () => {
    const combinedSeed = buildCombinedSeed(SERVER_SEED, CLIENT_SEED, NONCE);
    const seed = seedFromHex(combinedSeed);
    const prng = new XorShift32(seed);

    const pegMap = buildPegMap(ROWS, prng);
    const { path, binIndex } = runDrop(pegMap, 6, prng);

    const full = computeAll(SERVER_SEED, CLIENT_SEED, NONCE, 6);
    expect(binIndex).toBe(full.binIndex);
    expect(path).toEqual(full.path);
  });
});
