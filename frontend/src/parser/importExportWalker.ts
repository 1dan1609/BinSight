import type { Export, Import } from "@pe-analyzer/shared-types";
import { rvaToFileOffset } from "./sectionAnalyzer";
import type { SafeReader } from "./safeReader";
import type { DataDirectory, ParsedSection } from "./types";

const MAX_IMPORTED_DLLS = 512;
const MAX_FUNCTIONS_PER_DLL = 2000;
const MAX_EXPORTS = 4000;
const IMPORT_DESCRIPTOR_SIZE = 20;
const ORDINAL_FLAG_32 = 0x80000000;

export function parseImports(
  reader: SafeReader,
  dataDirectories: DataDirectory[],
  sections: ParsedSection[],
  isPE32Plus: boolean,
  warnings: string[],
): Import[] {
  const importDirectory = dataDirectories[1];
  if (!importDirectory || importDirectory.virtualAddress === 0) return [];

  const tableOffset = rvaToFileOffset(importDirectory.virtualAddress, sections);
  if (tableOffset === null) {
    warnings.push("Import table RVA does not resolve to any section");
    return [];
  }

  const imports: Import[] = [];

  for (let i = 0; i < MAX_IMPORTED_DLLS; i++) {
    const descOffset = tableOffset + i * IMPORT_DESCRIPTOR_SIZE;
    if (!reader.inBounds(descOffset, IMPORT_DESCRIPTOR_SIZE)) {
      warnings.push("Import descriptor table truncated by file bounds");
      break;
    }

    const originalFirstThunk = reader.u32(descOffset);
    const nameRva = reader.u32(descOffset + 12);
    const firstThunk = reader.u32(descOffset + 16);

    if (originalFirstThunk === 0 && nameRva === 0 && firstThunk === 0) {
      break; // null-terminator descriptor
    }
    if (nameRva === 0) continue;

    const nameOffset = rvaToFileOffset(nameRva, sections);
    if (nameOffset === null) continue;
    const dll = reader.cString(nameOffset);

    const thunkRva = originalFirstThunk !== 0 ? originalFirstThunk : firstThunk;
    const thunkOffset = rvaToFileOffset(thunkRva, sections);
    const functions: string[] = [];
    let ordinalOnlyCount = 0;

    if (thunkOffset !== null) {
      const entrySize = isPE32Plus ? 8 : 4;
      for (let j = 0; j < MAX_FUNCTIONS_PER_DLL; j++) {
        const entryOffset = thunkOffset + j * entrySize;
        if (!reader.inBounds(entryOffset, entrySize)) break;

        const low = reader.u32(entryOffset);
        const high = isPE32Plus ? reader.u32(entryOffset + 4) : 0;
        if (low === 0 && high === 0) break;

        const isOrdinal = isPE32Plus ? (high & 0x80000000) !== 0 : (low & ORDINAL_FLAG_32) !== 0;
        if (isOrdinal) {
          ordinalOnlyCount++;
          continue;
        }

        const hintNameOffset = rvaToFileOffset(low, sections);
        if (hintNameOffset === null) continue;
        // IMAGE_IMPORT_BY_NAME: 2-byte Hint, then the name string.
        const funcName = reader.cString(hintNameOffset + 2);
        if (funcName) functions.push(funcName);
      }
    }

    imports.push({ dll, functions, ordinalOnlyCount });
  }

  return imports;
}

export function parseExports(
  reader: SafeReader,
  dataDirectories: DataDirectory[],
  sections: ParsedSection[],
  warnings: string[],
): Export[] {
  const exportDirectory = dataDirectories[0];
  if (!exportDirectory || exportDirectory.virtualAddress === 0) return [];

  const dirOffset = rvaToFileOffset(exportDirectory.virtualAddress, sections);
  if (dirOffset === null) {
    warnings.push("Export table RVA does not resolve to any section");
    return [];
  }

  const base = reader.u32(dirOffset + 16);
  const numberOfNames = Math.min(reader.u32(dirOffset + 24), MAX_EXPORTS);
  const addressOfNamesRva = reader.u32(dirOffset + 32);
  const addressOfNameOrdinalsRva = reader.u32(dirOffset + 36);

  const namesOffset = rvaToFileOffset(addressOfNamesRva, sections);
  const ordinalsOffset = rvaToFileOffset(addressOfNameOrdinalsRva, sections);
  if (namesOffset === null || ordinalsOffset === null) return [];

  const exports: Export[] = [];
  for (let i = 0; i < numberOfNames; i++) {
    const nameRvaOffset = namesOffset + i * 4;
    const ordinalOffset = ordinalsOffset + i * 2;
    if (!reader.inBounds(nameRvaOffset, 4) || !reader.inBounds(ordinalOffset, 2)) break;

    const nameRva = reader.u32(nameRvaOffset);
    const nameOffset = rvaToFileOffset(nameRva, sections);
    if (nameOffset === null) continue;

    const name = reader.cString(nameOffset);
    const ordinalIndex = reader.u16(ordinalOffset);
    exports.push({ name, ordinal: base + ordinalIndex });
  }

  return exports;
}
