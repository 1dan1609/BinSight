import type { TlsInfo } from "@pe-analyzer/shared-types";
import type { SafeReader } from "./safeReader";
import { rvaToFileOffset } from "./sectionAnalyzer";
import type { DataDirectory, ParsedSection } from "./types";

const MAX_CALLBACKS = 64;
const TLS_DIRECTORY_INDEX = 9;

/**
 * TLS callbacks run before the PE's declared entry point — a well-known anti-debugging /
 * anti-sandbox technique, since many automated analysis tools only hook the entry point.
 */
export function parseTls(
  reader: SafeReader,
  dataDirectories: DataDirectory[],
  sections: ParsedSection[],
  imageBase: number,
  isPE32Plus: boolean,
  warnings: string[],
): TlsInfo {
  const tlsDirectory = dataDirectories[TLS_DIRECTORY_INDEX];
  if (!tlsDirectory || tlsDirectory.virtualAddress === 0) {
    return { present: false, callbackCount: 0, callbackAddresses: [] };
  }

  const tlsOffset = rvaToFileOffset(tlsDirectory.virtualAddress, sections);
  if (tlsOffset === null) {
    warnings.push("TLS directory RVA does not resolve to any section");
    return { present: false, callbackCount: 0, callbackAddresses: [] };
  }

  const addressOfCallbacksOffsetInDir = isPE32Plus ? 24 : 12;
  const addressSize = isPE32Plus ? 8 : 4;
  if (!reader.inBounds(tlsOffset + addressOfCallbacksOffsetInDir, addressSize)) {
    return { present: true, callbackCount: 0, callbackAddresses: [] };
  }

  const callbacksVa = isPE32Plus
    ? reader.u64(tlsOffset + addressOfCallbacksOffsetInDir)
    : reader.u32(tlsOffset + addressOfCallbacksOffsetInDir);
  if (callbacksVa === 0) {
    return { present: true, callbackCount: 0, callbackAddresses: [] };
  }

  const callbacksRva = callbacksVa - imageBase;
  const callbacksFileOffset = rvaToFileOffset(callbacksRva, sections);
  if (callbacksFileOffset === null) {
    warnings.push("TLS callback array VA does not resolve to any section");
    return { present: true, callbackCount: 0, callbackAddresses: [] };
  }

  const callbackAddresses: number[] = [];
  for (let i = 0; i < MAX_CALLBACKS; i++) {
    const entryOffset = callbacksFileOffset + i * addressSize;
    if (!reader.inBounds(entryOffset, addressSize)) break;
    const va = isPE32Plus ? reader.u64(entryOffset) : reader.u32(entryOffset);
    if (va === 0) break;
    callbackAddresses.push(va);
  }

  return { present: true, callbackCount: callbackAddresses.length, callbackAddresses };
}
