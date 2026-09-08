import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildIndicators, PEParseError } from "../../src/parser/indicatorsBuilder";

const FIXTURE_PATH = fileURLToPath(new URL("../../fixtures/hello.exe", import.meta.url));
const FIXTURE_BYTES = new Uint8Array(readFileSync(FIXTURE_PATH));
const TIME_BUDGET_MS = 3000;

/**
 * The parser's whole job is handling untrusted, adversarial binaries. These tests assert three
 * things regardless of how malformed the input is: (1) the only exception type that ever escapes
 * is the typed PEParseError — never a raw TypeError/RangeError from an unguarded read, (2) parsing
 * completes within a bounded time (no infinite loops / pathological scans), (3) a successful parse
 * never exceeds the documented output caps.
 */
async function assertParsesSafely(buffer: ArrayBuffer): Promise<void> {
  const start = performance.now();
  try {
    const { indicators } = await buildIndicators(buffer);
    expect(indicators.sections.length).toBeLessThanOrEqual(96);
    expect(indicators.imports.length).toBeLessThanOrEqual(512);
    expect(indicators.exports.length).toBeLessThanOrEqual(4000);
    expect(indicators.strings.length).toBeLessThanOrEqual(2000);
  } catch (error) {
    if (!(error instanceof PEParseError)) {
      throw new Error(
        `Parser leaked a non-PEParseError exception for adversarial input: ${String(error)}`,
      );
    }
  }
  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(TIME_BUDGET_MS);
}

describe("PE parser fuzzing: truncation", () => {
  it("never crashes or hangs on the fixture truncated to any length", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: FIXTURE_BYTES.length }), async (cutoff) => {
        const truncated = FIXTURE_BYTES.slice(0, cutoff).buffer;
        await assertParsesSafely(truncated);
      }),
      { numRuns: 200 },
    );
  });
});

describe("PE parser fuzzing: random byte flips", () => {
  it("never crashes or hangs when random bytes are corrupted", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 0, max: FIXTURE_BYTES.length - 1 }), { minLength: 1, maxLength: 40 }),
        fc.array(fc.integer({ min: 0, max: 255 }), { minLength: 1, maxLength: 40 }),
        async (positions, values) => {
          const corrupted = FIXTURE_BYTES.slice();
          positions.forEach((pos, i) => {
            corrupted[pos] = values[i % values.length]!;
          });
          await assertParsesSafely(corrupted.buffer);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("PE parser fuzzing: structural edge cases", () => {
  it("handles a zero-length buffer", async () => {
    await assertParsesSafely(new ArrayBuffer(0));
  });

  it("handles a 1-byte buffer", async () => {
    await assertParsesSafely(new ArrayBuffer(1));
  });

  it("handles random non-PE garbage of varying length", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uint8Array({ minLength: 0, maxLength: 4096 }), async (bytes) => {
        await assertParsesSafely(bytes.buffer as ArrayBuffer);
      }),
      { numRuns: 200 },
    );
  });

  it("handles an e_lfanew pointing far outside the buffer", () => {
    const buf = new ArrayBuffer(64);
    const view = new DataView(buf);
    view.setUint16(0, 0x5a4d, true); // "MZ"
    view.setUint32(0x3c, 0xffffffff, true); // e_lfanew: absurd offset
    return assertParsesSafely(buf);
  });

  it("handles a NumberOfSections claiming the maximum possible value", () => {
    const buf = new ArrayBuffer(1024);
    const view = new DataView(buf);
    view.setUint16(0, 0x5a4d, true); // "MZ"
    const peOffset = 128;
    view.setUint32(0x3c, peOffset, true);
    view.setUint32(peOffset, 0x00004550, true); // "PE\0\0"
    view.setUint16(peOffset + 4, 0x14c, true); // machine: I386
    view.setUint16(peOffset + 6, 0xffff, true); // NumberOfSections: max
    view.setUint16(peOffset + 16, 0xe0, true); // SizeOfOptionalHeader
    view.setUint16(peOffset + 20, 0x10b, true); // Magic: PE32
    return assertParsesSafely(buf);
  });

  it("handles a self-referential / overlapping section table offset", () => {
    const buf = new ArrayBuffer(2048);
    const view = new DataView(buf);
    view.setUint16(0, 0x5a4d, true);
    const peOffset = 64;
    view.setUint32(0x3c, peOffset, true);
    view.setUint32(peOffset, 0x00004550, true);
    view.setUint16(peOffset + 4, 0x14c, true);
    view.setUint16(peOffset + 6, 5, true); // NumberOfSections
    view.setUint16(peOffset + 16, 0xe0, true); // SizeOfOptionalHeader
    view.setUint16(peOffset + 20, 0x10b, true); // Magic
    // Section table offset lands back inside the DOS header, overlapping earlier bytes.
    for (let i = 0; i < 5; i++) {
      const sectionOffset = peOffset + 24 + 0xe0 + i * 40;
      if (sectionOffset + 40 <= buf.byteLength) {
        view.setUint32(sectionOffset + 16, 0xffffffff, true); // absurd raw size
        view.setUint32(sectionOffset + 20, 0, true); // raw address pointing at the DOS header
      }
    }
    return assertParsesSafely(buf);
  });
});
