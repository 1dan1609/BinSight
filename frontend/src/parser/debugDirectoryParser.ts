import type { DebugInfo } from "@pe-analyzer/shared-types";
import type { SafeReader } from "./safeReader";
import { rvaToFileOffset } from "./sectionAnalyzer";
import type { DataDirectory, ParsedSection } from "./types";

const DEBUG_DIRECTORY_INDEX = 6;
const DEBUG_ENTRY_SIZE = 28;
const MAX_DEBUG_ENTRIES = 32;
const IMAGE_DEBUG_TYPE_CODEVIEW = 2;
const RSDS_SIGNATURE = 0x53445352; // "RSDS"

/**
 * The CodeView debug entry's PDB path often leaks the build machine's username/directory
 * structure — a useful, frequently-overlooked attribution/OSINT indicator.
 */
export function parseDebugInfo(
  reader: SafeReader,
  dataDirectories: DataDirectory[],
  sections: ParsedSection[],
  warnings: string[],
): DebugInfo {
  const debugDirectory = dataDirectories[DEBUG_DIRECTORY_INDEX];
  if (!debugDirectory || debugDirectory.virtualAddress === 0) {
    return { hasDebugDirectory: false, pdbPath: null };
  }

  const debugDirOffset = rvaToFileOffset(debugDirectory.virtualAddress, sections);
  if (debugDirOffset === null) {
    warnings.push("Debug directory RVA does not resolve to any section");
    return { hasDebugDirectory: false, pdbPath: null };
  }

  const entryCount = Math.min(
    Math.floor(debugDirectory.size / DEBUG_ENTRY_SIZE),
    MAX_DEBUG_ENTRIES,
  );

  for (let i = 0; i < entryCount; i++) {
    const entryOffset = debugDirOffset + i * DEBUG_ENTRY_SIZE;
    if (!reader.inBounds(entryOffset, DEBUG_ENTRY_SIZE)) break;

    const type = reader.u32(entryOffset + 12);
    if (type !== IMAGE_DEBUG_TYPE_CODEVIEW) continue;

    const pointerToRawData = reader.u32(entryOffset + 24); // already a file offset, not an RVA
    if (pointerToRawData === 0 || !reader.inBounds(pointerToRawData, 4)) continue;

    const signature = reader.u32(pointerToRawData);
    if (signature !== RSDS_SIGNATURE) continue;

    // RSDS record: 4-byte "RSDS" + 16-byte GUID + 4-byte age + null-terminated PDB path.
    const pdbPathOffset = pointerToRawData + 4 + 16 + 4;
    if (!reader.inBounds(pdbPathOffset)) continue;
    const pdbPath = reader.cString(pdbPathOffset, 512);
    if (pdbPath.length > 0) {
      return { hasDebugDirectory: true, pdbPath };
    }
  }

  return { hasDebugDirectory: true, pdbPath: null };
}
