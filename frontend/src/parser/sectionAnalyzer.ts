import { calculateShannonEntropy } from "./entropyCalculator";
import type { SafeReader } from "./safeReader";
import type { ParsedSection, ParsedSectionAnomaly } from "./types";

const SECTION_HEADER_SIZE = 40;
const HIGH_ENTROPY_THRESHOLD = 7.0;
const MAX_SECTION_BYTES_FOR_ENTROPY = 32 * 1024 * 1024; // cap adversarially huge declared sizes

const SECTION_CHARACTERISTICS: [number, string][] = [
  [0x00000020, "CODE"],
  [0x00000040, "INITIALIZED_DATA"],
  [0x00000080, "UNINITIALIZED_DATA"],
  [0x02000000, "MEM_DISCARDABLE"],
  [0x04000000, "MEM_NOT_CACHED"],
  [0x08000000, "MEM_NOT_PAGED"],
  [0x10000000, "MEM_SHARED"],
  [0x20000000, "MEM_EXECUTE"],
  [0x40000000, "MEM_READ"],
  [0x80000000, "MEM_WRITE"],
];

const MEM_EXECUTE = 0x20000000;
const MEM_WRITE = 0x80000000;

const STANDARD_SECTION_NAMES = new Set([
  ".text",
  ".data",
  ".rdata",
  ".bss",
  ".idata",
  ".edata",
  ".pdata",
  ".rsrc",
  ".reloc",
  ".tls",
  ".debug",
]);

function decodeFlags(value: number, table: [number, string][]): string[] {
  return table.filter(([bit]) => (value & bit) === bit).map(([, name]) => name);
}

export function parseSections(
  reader: SafeReader,
  sectionTableOffset: number,
  numberOfSections: number,
  warnings: string[],
): ParsedSection[] {
  const sections: ParsedSection[] = [];

  for (let i = 0; i < numberOfSections; i++) {
    const offset = sectionTableOffset + i * SECTION_HEADER_SIZE;
    if (!reader.inBounds(offset, SECTION_HEADER_SIZE)) {
      warnings.push(`Section table truncated after ${i} of ${numberOfSections} declared sections`);
      break;
    }

    const name = reader.fixedAscii(offset, 8);
    const virtualSize = reader.u32(offset + 8);
    const virtualAddress = reader.u32(offset + 12);
    const rawSize = reader.u32(offset + 16);
    const rawAddress = reader.u32(offset + 20);
    const characteristicsRaw = reader.u32(offset + 36);
    const characteristics = decodeFlags(characteristicsRaw, SECTION_CHARACTERISTICS);

    const anomalies: ParsedSectionAnomaly[] = [];
    let entropy = 0;

    const clampedRawSize = Math.min(rawSize, MAX_SECTION_BYTES_FOR_ENTROPY);
    if (rawSize > 0 && reader.inBounds(rawAddress, clampedRawSize)) {
      const sectionBytes = reader.bytes(rawAddress, clampedRawSize);
      entropy = calculateShannonEntropy(sectionBytes);
    } else if (rawSize > 0) {
      warnings.push(`Section "${name}" declares raw data outside file bounds; entropy skipped`);
    }

    if ((characteristicsRaw & MEM_WRITE) !== 0 && (characteristicsRaw & MEM_EXECUTE) !== 0) {
      anomalies.push("WRITABLE_AND_EXECUTABLE");
    }
    if (virtualSize > rawSize && rawSize > 0) {
      anomalies.push("VIRTUAL_SIZE_EXCEEDS_RAW_SIZE");
    }
    if (rawSize === 0 && virtualSize > 0) {
      anomalies.push("ZERO_RAW_SIZE_NONZERO_VIRTUAL_SIZE");
    }
    if (entropy > HIGH_ENTROPY_THRESHOLD) {
      anomalies.push("HIGH_ENTROPY");
    }
    if (!STANDARD_SECTION_NAMES.has(name.toLowerCase()) && name.length > 0) {
      anomalies.push("NON_STANDARD_NAME");
    }

    sections.push({
      name,
      virtualSize,
      virtualAddress,
      rawSize,
      rawAddress,
      entropy,
      characteristics,
      anomalies,
    });
  }

  return sections;
}

/** Resolves an RVA to a file offset via the section table; returns null if it falls outside every section. */
export function rvaToFileOffset(rva: number, sections: ParsedSection[]): number | null {
  for (const section of sections) {
    const span = Math.max(section.virtualSize, section.rawSize);
    if (rva >= section.virtualAddress && rva < section.virtualAddress + span) {
      return section.rawAddress + (rva - section.virtualAddress);
    }
  }
  return null;
}
