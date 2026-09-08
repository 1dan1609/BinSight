import type { SafeReader } from "./safeReader";

export interface DataDirectory {
  virtualAddress: number;
  size: number;
}

/** Internal, richer-than-shared-schema parse result — indicatorsBuilder projects this down to IndicatorsJson. */
export interface ParsedPeHeader {
  isPE32Plus: boolean;
  machine: string;
  numberOfSections: number;
  timeDateStamp: number;
  characteristics: string[];
  subsystem: string;
  dllCharacteristics: string[];
  entryPointAddress: number;
  imageBase: number;
  sizeOfImage: number;
  sectionTableOffset: number;
  dataDirectories: DataDirectory[];
  /** COFF symbol table location, needed to resolve section names >8 chars ("/N" long-name form). */
  pointerToSymbolTable: number;
  numberOfSymbols: number;
}

export interface ParsedSection {
  name: string;
  virtualSize: number;
  virtualAddress: number;
  rawSize: number;
  rawAddress: number;
  entropy: number;
  characteristics: string[];
  anomalies: ParsedSectionAnomaly[];
}

export type ParsedSectionAnomaly =
  | "WRITABLE_AND_EXECUTABLE"
  | "VIRTUAL_SIZE_EXCEEDS_RAW_SIZE"
  | "HIGH_ENTROPY"
  | "NON_STANDARD_NAME"
  | "ZERO_RAW_SIZE_NONZERO_VIRTUAL_SIZE";

export interface ParseContext {
  reader: SafeReader;
  warnings: string[];
}
