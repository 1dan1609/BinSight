import { PEParseError, type SafeReader } from "./safeReader";
import type { DataDirectory, ParsedPeHeader } from "./types";

const DOS_MAGIC = 0x5a4d; // "MZ"
const PE_SIGNATURE = 0x00004550; // "PE\0\0"
const PE32_MAGIC = 0x10b;
const PE32_PLUS_MAGIC = 0x20b;

const MACHINE_TYPES: Record<number, string> = {
  0x0: "UNKNOWN",
  0x14c: "I386",
  0x1c0: "ARM",
  0x8664: "AMD64",
  0xaa64: "ARM64",
  0x200: "IA64",
};

const FILE_CHARACTERISTICS: [number, string][] = [
  [0x0001, "RELOCS_STRIPPED"],
  [0x0002, "EXECUTABLE_IMAGE"],
  [0x0004, "LINE_NUMS_STRIPPED"],
  [0x0008, "LOCAL_SYMS_STRIPPED"],
  [0x0010, "AGGRESSIVE_WS_TRIM"],
  [0x0020, "LARGE_ADDRESS_AWARE"],
  [0x0100, "32BIT_MACHINE"],
  [0x0200, "DEBUG_STRIPPED"],
  [0x1000, "SYSTEM"],
  [0x2000, "DLL"],
  [0x8000, "BYTES_REVERSED_HI"],
];

const DLL_CHARACTERISTICS: [number, string][] = [
  [0x0020, "HIGH_ENTROPY_VA"],
  [0x0040, "DYNAMIC_BASE"],
  [0x0080, "FORCE_INTEGRITY"],
  [0x0100, "NX_COMPAT"],
  [0x0400, "NO_SEH"],
  [0x0800, "NO_BIND"],
  [0x1000, "APPCONTAINER"],
  [0x2000, "WDM_DRIVER"],
  [0x4000, "GUARD_CF"],
  [0x8000, "TERMINAL_SERVER_AWARE"],
];

const SUBSYSTEMS: Record<number, string> = {
  0: "UNKNOWN",
  1: "NATIVE",
  2: "WINDOWS_GUI",
  3: "WINDOWS_CUI",
  5: "OS2_CUI",
  7: "POSIX_CUI",
  9: "WINDOWS_CE_GUI",
  10: "EFI_APPLICATION",
  11: "EFI_BOOT_SERVICE_DRIVER",
  12: "EFI_RUNTIME_DRIVER",
  13: "EFI_ROM",
  14: "XBOX",
  16: "WINDOWS_BOOT_APPLICATION",
};

function decodeFlags(value: number, table: [number, string][]): string[] {
  return table.filter(([bit]) => (value & bit) === bit).map(([, name]) => name);
}

const MAX_DATA_DIRECTORIES = 16;
const MAX_SECTIONS = 96;

export function parsePeHeader(reader: SafeReader): ParsedPeHeader {
  if (reader.u16(0) !== DOS_MAGIC) {
    throw new PEParseError("Not a PE file: missing MZ signature");
  }
  const e_lfanew = reader.u32(0x3c);
  if (e_lfanew < 0 || e_lfanew > reader.length - 4) {
    throw new PEParseError(`Invalid e_lfanew offset: ${e_lfanew}`);
  }

  if (reader.u32(e_lfanew) !== PE_SIGNATURE) {
    throw new PEParseError("Not a PE file: missing PE\\0\\0 signature");
  }

  const fileHeaderOffset = e_lfanew + 4;
  const machineRaw = reader.u16(fileHeaderOffset);
  const numberOfSectionsRaw = reader.u16(fileHeaderOffset + 2);
  const numberOfSections = Math.min(numberOfSectionsRaw, MAX_SECTIONS);
  const timeDateStamp = reader.u32(fileHeaderOffset + 4);
  const pointerToSymbolTable = reader.u32(fileHeaderOffset + 8);
  const numberOfSymbols = reader.u32(fileHeaderOffset + 12);
  const sizeOfOptionalHeader = reader.u16(fileHeaderOffset + 16);
  const characteristicsRaw = reader.u16(fileHeaderOffset + 18);

  const optionalHeaderOffset = fileHeaderOffset + 20;
  if (sizeOfOptionalHeader < 2) {
    throw new PEParseError("Optional header too small to contain a magic value");
  }
  const magic = reader.u16(optionalHeaderOffset);
  const isPE32Plus = magic === PE32_PLUS_MAGIC;
  if (magic !== PE32_MAGIC && !isPE32Plus) {
    throw new PEParseError(`Unrecognized optional header magic: 0x${magic.toString(16)}`);
  }

  const entryPointAddress = reader.u32(optionalHeaderOffset + 16);
  const imageBase = isPE32Plus ? reader.u64(optionalHeaderOffset + 24) : reader.u32(optionalHeaderOffset + 28);
  const sizeOfImage = reader.u32(optionalHeaderOffset + 56);
  const subsystemRaw = reader.u16(optionalHeaderOffset + 68);
  const dllCharacteristicsRaw = reader.u16(optionalHeaderOffset + 70);

  const numberOfRvaAndSizesOffset = isPE32Plus ? optionalHeaderOffset + 108 : optionalHeaderOffset + 92;
  const dataDirectoryOffset = isPE32Plus ? optionalHeaderOffset + 112 : optionalHeaderOffset + 96;
  const numberOfRvaAndSizesRaw = reader.u32(numberOfRvaAndSizesOffset);
  const numberOfRvaAndSizes = Math.min(numberOfRvaAndSizesRaw, MAX_DATA_DIRECTORIES);

  const dataDirectories: DataDirectory[] = [];
  for (let i = 0; i < numberOfRvaAndSizes; i++) {
    const entryOffset = dataDirectoryOffset + i * 8;
    if (!reader.inBounds(entryOffset, 8)) break;
    dataDirectories.push({
      virtualAddress: reader.u32(entryOffset),
      size: reader.u32(entryOffset + 4),
    });
  }

  const sectionTableOffset = optionalHeaderOffset + sizeOfOptionalHeader;

  return {
    isPE32Plus,
    machine: MACHINE_TYPES[machineRaw] ?? `UNKNOWN_0x${machineRaw.toString(16)}`,
    numberOfSections,
    timeDateStamp,
    characteristics: decodeFlags(characteristicsRaw, FILE_CHARACTERISTICS),
    subsystem: SUBSYSTEMS[subsystemRaw] ?? `UNKNOWN_${subsystemRaw}`,
    dllCharacteristics: decodeFlags(dllCharacteristicsRaw, DLL_CHARACTERISTICS),
    entryPointAddress,
    imageBase,
    sizeOfImage,
    sectionTableOffset,
    dataDirectories,
    pointerToSymbolTable,
    numberOfSymbols,
  };
}
