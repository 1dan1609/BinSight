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
    expect(indicators.schemaVersion).toBe(2);
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

    // MinGW stores names >8 chars (debug sections, .eh_frame) via the COFF long-name form
    // ("/N" -> string table offset) rather than inline — this fixture is a real-world case of
    // that, and the parser must resolve it rather than surfacing the raw "/N" placeholder.
    expect(indicators.sections.map((s) => s.name)).toEqual([
      ".text",
      ".data",
      ".rdata",
      ".eh_frame",
      ".bss",
      ".idata",
      ".CRT",
      ".tls",
      ".debug_aranges",
      ".debug_info",
      ".debug_abbrev",
      ".debug_line",
      ".debug_frame",
      ".debug_str",
    ]);
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

  it("detects the trailing overlay data after the last section", async () => {
    const { indicators } = await buildIndicators(loadFixtureBuffer());
    expect(indicators.overlay.present).toBe(true);
    expect(indicators.overlay.offset).toBeGreaterThan(0);
    expect(indicators.overlay.size).toBe(indicators.fileSize - indicators.overlay.offset);
  });

  it("detects the MinGW-internal TLS callbacks", async () => {
    const { indicators } = await buildIndicators(loadFixtureBuffer());
    expect(indicators.tls.present).toBe(true);
    expect(indicators.tls.callbackCount).toBeGreaterThan(0);
    expect(indicators.tls.callbackAddresses).toHaveLength(indicators.tls.callbackCount);
  });

  it("finds no PE Debug Directory (MinGW embeds DWARF sections directly, not a CodeView entry)", async () => {
    const { indicators } = await buildIndicators(loadFixtureBuffer());
    expect(indicators.debugInfo.hasDebugDirectory).toBe(false);
    expect(indicators.debugInfo.pdbPath).toBeNull();
  });

  it("finds no Rich header (an MSVC-linker-only artifact, absent from MinGW builds)", async () => {
    const { indicators } = await buildIndicators(loadFixtureBuffer());
    expect(indicators.richHeader.present).toBe(false);
    expect(indicators.richHeader.entries).toEqual([]);
  });

  it("surfaces overlay and TLS callback findings as heuristics", async () => {
    const { indicators } = await buildIndicators(loadFixtureBuffer());
    const ids = indicators.heuristics.map((h) => h.id);
    expect(ids).toContain("OVERLAY_DATA_PRESENT");
    expect(ids).toContain("TLS_CALLBACKS_PRESENT");
  });

  it("computes an overall file entropy in the valid range", async () => {
    const { indicators } = await buildIndicators(loadFixtureBuffer());
    expect(indicators.overallEntropy).toBeGreaterThan(0);
    expect(indicators.overallEntropy).toBeLessThanOrEqual(8);
  });
});
