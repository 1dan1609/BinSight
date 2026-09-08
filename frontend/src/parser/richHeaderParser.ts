import type { RichHeader, RichHeaderEntry } from "@pe-analyzer/shared-types";
import type { SafeReader } from "./safeReader";

const RICH_SIGNATURE = 0x68636952; // "Rich" little-endian
const DANS_SIGNATURE = 0x536e6144; // "DanS" little-endian
const DOS_HEADER_SIZE = 0x40;
const MAX_ENTRIES = 128;

const EMPTY_RICH_HEADER: RichHeader = { present: false, xorKey: 0, entries: [] };

/**
 * The undocumented "Rich" header sits between the DOS stub and the PE header, and encodes an
 * XOR-obfuscated list of (compiler/linker tool, build, invocation count) tuples — a fingerprint
 * of the exact toolchain used to build the binary. Widely used by malware researchers for
 * family/build clustering, even without a full tool-ID -> name lookup table (which this parser
 * deliberately doesn't ship — the raw IDs are still useful signal on their own).
 */
export function parseRichHeader(reader: SafeReader, e_lfanew: number): RichHeader {
  if (e_lfanew <= DOS_HEADER_SIZE || !reader.inBounds(DOS_HEADER_SIZE, e_lfanew - DOS_HEADER_SIZE)) {
    return EMPTY_RICH_HEADER;
  }

  let richOffset = -1;
  for (let offset = e_lfanew - 4; offset >= DOS_HEADER_SIZE; offset -= 4) {
    if (reader.u32(offset) === RICH_SIGNATURE) {
      richOffset = offset;
      break;
    }
  }
  if (richOffset === -1) return EMPTY_RICH_HEADER;

  if (!reader.inBounds(richOffset + 4, 4)) return EMPTY_RICH_HEADER;
  const xorKey = reader.u32(richOffset + 4);

  let dansOffset = -1;
  for (let offset = richOffset - 4; offset >= DOS_HEADER_SIZE; offset -= 4) {
    if ((reader.u32(offset) ^ xorKey) >>> 0 === DANS_SIGNATURE) {
      dansOffset = offset;
      break;
    }
  }
  if (dansOffset === -1) return EMPTY_RICH_HEADER;

  const entries: RichHeaderEntry[] = [];
  // Entries start 16 bytes after "DanS" (3 zero-padding dwords follow the signature), in pairs,
  // and end right before the plaintext "Rich" marker.
  for (let offset = dansOffset + 16; offset + 8 <= richOffset && entries.length < MAX_ENTRIES; offset += 8) {
    const compId = (reader.u32(offset) ^ xorKey) >>> 0;
    const count = (reader.u32(offset + 4) ^ xorKey) >>> 0;
    entries.push({ buildId: compId & 0xffff, productId: (compId >>> 16) & 0xffff, count });
  }

  return { present: true, xorKey, entries };
}
