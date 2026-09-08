import type { Overlay } from "@pe-analyzer/shared-types";
import { calculateShannonEntropy } from "./entropyCalculator";
import type { SafeReader } from "./safeReader";
import type { ParsedSection } from "./types";

const MAX_OVERLAY_BYTES_FOR_ENTROPY = 32 * 1024 * 1024;

/**
 * Overlay = data appended after the end of the last section's raw data — a classic spot for
 * malware to hide a secondary payload, since it's outside the PE loader's mapped image and
 * invisible to tools that only look at declared sections.
 */
export function analyzeOverlay(reader: SafeReader, sections: ParsedSection[]): Overlay {
  const endOfLastSection = sections.reduce(
    (max, s) => Math.max(max, s.rawAddress + s.rawSize),
    0,
  );

  if (sections.length === 0 || endOfLastSection >= reader.length) {
    return { present: false, offset: 0, size: 0, entropy: 0 };
  }

  const size = reader.length - endOfLastSection;
  const clampedSize = Math.min(size, MAX_OVERLAY_BYTES_FOR_ENTROPY);
  const entropy = calculateShannonEntropy(reader.bytes(endOfLastSection, clampedSize));

  return { present: true, offset: endOfLastSection, size, entropy };
}
