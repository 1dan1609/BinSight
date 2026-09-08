import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildIndicators } from "../../src/parser/indicatorsBuilder";

const FIXTURE_PATH = fileURLToPath(new URL("../../fixtures/hello.exe", import.meta.url));

function loadFixtureBuffer(): ArrayBuffer {
  const nodeBuffer = readFileSync(FIXTURE_PATH);
  return nodeBuffer.buffer.slice(
    nodeBuffer.byteOffset,
    nodeBuffer.byteOffset + nodeBuffer.byteLength,
  ) as ArrayBuffer;
}

describe("buildIndicators against a real, self-compiled benign PE fixture", () => {
  it("parses header fields exactly (cross-checked against objdump -p)", async () => {
    const { indicators } = await buildIndicators(loadFixtureBuffer());

    expect(indicators.format).toBe("pe");
    expect(indicators.schemaVersion).toBe(1);
    expect(indicators.fileSize).toBe(44911);
    expect(indicators.truncated).toBe(false);
    expect(indicators.parseWarnings).toEqual([]);

    expect(indicators.header.isPE32Plus).toBe(false);
    expect(indicators.header.machine).toBe("I386");
    expect(indicators.header.numberOfSections).toBe(14);
    expect(new Set(indicators.header.characteristics)).toEqual(
      new Set(["RELOCS_STRIPPED", "EXECUTABLE_IMAGE", "LINE_NUMS_STRIPPED", "32BIT_MACHINE"]),
    );
    expect(indicators.header.subsystem).toBe("WINDOWS_CUI");
    expect(indicators.header.dllCharacteristics).toEqual([]);
    expect(indicators.header.entryPointAddress).toBe(0x12d0);
    expect(indicators.header.imageBase).toBe(0x400000);
    expect(indicators.header.sizeOfImage).toBe(0x12000);
  });

  it("computes file hashes matching independently-computed reference values", async () => {
    const { indicators } = await buildIndicators(loadFixtureBuffer());

    expect(indicators.hashes.sha256).toBe(
      "84b2dbf4b7eca104de404d9596fa7f1f81ad1cf79caada9a36114ba3d90eea22",
    );
    expect(indicators.hashes.md5).toBe("486dc204ee41472e24b4398765e2e66c");
    expect(indicators.hashes.sha1).toBe("46865cc49407346774aedb034f4b39ca78bee8ed");
  });

  it("parses the section table", async () => {
    const { indicators } = await buildIndicators(loadFixtureBuffer());

    expect(indicators.sections).toHaveLength(14);
    expect(indicators.sections[0]?.name).toBe(".text");
    expect(indicators.sections[0]?.entropy).toBeGreaterThan(0);
    expect(indicators.sections[0]?.entropy).toBeLessThanOrEqual(8);
    // A freshly-compiled, unpacked binary should not trip the packing heuristic.
    for (const section of indicators.sections) {
      expect(section.anomalies).not.toContain("HIGH_ENTROPY");
    }
  });

  it("resolves the import table", async () => {
    const { indicators } = await buildIndicators(loadFixtureBuffer());

    const dllNames = indicators.imports.map((imp) => imp.dll.toLowerCase());
    expect(dllNames).toContain("kernel32.dll");
    expect(dllNames).toContain("msvcrt.dll");

    const kernel32 = indicators.imports.find((imp) => imp.dll.toLowerCase() === "kernel32.dll");
    expect(kernel32?.functions.length).toBeGreaterThan(0);
  });

  it("computes an overall file entropy in the valid range", async () => {
    const { indicators } = await buildIndicators(loadFixtureBuffer());
    expect(indicators.overallEntropy).toBeGreaterThan(0);
    expect(indicators.overallEntropy).toBeLessThanOrEqual(8);
  });
});
