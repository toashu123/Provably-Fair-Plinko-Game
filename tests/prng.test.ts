import { describe, it, expect } from "vitest";
import { XorShift32, seedFromHex } from "@/lib/prng/xorshift32";

describe("XorShift32 PRNG", () => {
  it("produces a deterministic sequence from a fixed seed", () => {
    const prng1 = new XorShift32(12345);
    const prng2 = new XorShift32(12345);

    const seq1 = Array.from({ length: 10 }, () => prng1.next());
    const seq2 = Array.from({ length: 10 }, () => prng2.next());

    expect(seq1).toEqual(seq2);
  });

  it("produces different sequences from different seeds", () => {
    const prng1 = new XorShift32(1);
    const prng2 = new XorShift32(2);

    expect(prng1.next()).not.toBe(prng2.next());
  });

  it("rand() returns values in [0, 1)", () => {
    const prng = new XorShift32(99999);
    for (let i = 0; i < 1000; i++) {
      const v = prng.rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("never produces 0 as state (XorShift invariant)", () => {
    const prng = new XorShift32(1);
    for (let i = 0; i < 10000; i++) {
      expect(prng.next()).toBeGreaterThan(0);
    }
  });

  it("seedFromHex extracts first 4 bytes big-endian correctly", () => {
    // "deadbeef..." → 0xDEADBEEF = 3735928559
    const seed = seedFromHex("deadbeef0000000000000000");
    expect(seed).toBe(0xdeadbeef >>> 0);
  });

  it("seedFromHex with the test vector combinedSeed", () => {
    const combinedSeed =
      "e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0";
    const seed = seedFromHex(combinedSeed);
    // First 4 bytes: e1 dd df 77 = 0xe1dddf77 = 3789078391
    expect(seed).toBe(0xe1dddf77 >>> 0);
  });

  it("produces consistent rand() sequence from spec seed", () => {
    const combinedSeed =
      "e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0";
    const seed = seedFromHex(combinedSeed);
    const prng = new XorShift32(seed);

    // First 5 values should be deterministic
    const vals = Array.from({ length: 5 }, () => prng.rand());
    // Store a reference run — just ensure determinism by running twice
    const prng2 = new XorShift32(seed);
    const vals2 = Array.from({ length: 5 }, () => prng2.rand());

    expect(vals).toEqual(vals2);
  });
});
