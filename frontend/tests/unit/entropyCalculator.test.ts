import { describe, expect, it } from "vitest";
import { calculateShannonEntropy } from "../../src/parser/entropyCalculator";

describe("calculateShannonEntropy", () => {
  it("returns 0 for empty input", () => {
    expect(calculateShannonEntropy(new Uint8Array())).toBe(0);
  });

  it("returns 0 for a buffer of all-identical bytes", () => {
    expect(calculateShannonEntropy(new Uint8Array(1000).fill(0x41))).toBe(0);
  });

  it("returns 1 for a buffer with exactly two equally-likely byte values", () => {
    const bytes = new Uint8Array(1000);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 2 === 0 ? 0x00 : 0xff;
    expect(calculateShannonEntropy(bytes)).toBeCloseTo(1, 5);
  });

  it("approaches 8 for uniformly-distributed random bytes", () => {
    const bytes = new Uint8Array(65536);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
    expect(calculateShannonEntropy(bytes)).toBeCloseTo(8, 5);
  });
});
