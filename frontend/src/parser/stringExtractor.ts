import type { ExtractedString, StringCategory as Category } from "@pe-analyzer/shared-types";
import { SUSPICIOUS_STRING_KEYWORDS } from "./heuristics";

const MIN_STRING_LENGTH = 4;
const MAX_STRING_LENGTH = 1024;
const MAX_EXTRACTED_STRINGS = 2000;
const MAX_SCAN_BYTES = 64 * 1024 * 1024; // bound worst-case scan time on adversarially huge files

const URL_RE = /^[a-z][a-z0-9+.-]*:\/\/\S+$/i;
const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const REGISTRY_RE = /^(HKEY_|HKLM|HKCU|HKCR|HKU)\\?/i;
const FILE_PATH_RE = /^([a-z]:\\|\\\\|\/[a-z]|\.\.?\/)/i;

function isPrintableAsciiByte(byte: number): boolean {
  return byte >= 0x20 && byte <= 0x7e;
}

function classify(value: string): Category {
  const lower = value.toLowerCase();
  if (URL_RE.test(value)) return "URL";
  if (IPV4_RE.test(value)) return "IPV4";
  if (EMAIL_RE.test(value)) return "EMAIL";
  if (REGISTRY_RE.test(value)) return "REGISTRY_KEY";
  if (FILE_PATH_RE.test(value)) return "FILE_PATH";
  if (SUSPICIOUS_STRING_KEYWORDS.some((kw) => lower.includes(kw))) return "SUSPICIOUS_KEYWORD";
  return "OTHER";
}

const CATEGORY_BASE_SCORE: Record<Category, number> = {
  URL: 0.8,
  IPV4: 0.75,
  SUSPICIOUS_KEYWORD: 0.9,
  REGISTRY_KEY: 0.6,
  EMAIL: 0.5,
  FILE_PATH: 0.4,
  OTHER: 0.1,
};

function scoreString(value: string, category: Category): number {
  const lengthBonus = Math.min(value.length / 200, 0.1);
  return Math.min(1, (CATEGORY_BASE_SCORE[category] ?? 0.1) + lengthBonus);
}

function extractAsciiRuns(bytes: Uint8Array, limit: number): string[] {
  const runs: string[] = [];
  let start = -1;
  for (let i = 0; i < limit; i++) {
    const byte = bytes[i]!;
    if (isPrintableAsciiByte(byte)) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      const len = i - start;
      if (len >= MIN_STRING_LENGTH) {
        runs.push(bytesToAscii(bytes, start, Math.min(len, MAX_STRING_LENGTH)));
      }
      start = -1;
    }
  }
  if (start !== -1 && limit - start >= MIN_STRING_LENGTH) {
    runs.push(bytesToAscii(bytes, start, Math.min(limit - start, MAX_STRING_LENGTH)));
  }
  return runs;
}

function bytesToAscii(bytes: Uint8Array, start: number, len: number): string {
  let out = "";
  for (let i = start; i < start + len; i++) {
    out += String.fromCharCode(bytes[i]!);
  }
  return out;
}

function extractUtf16LeRuns(bytes: Uint8Array, limit: number): string[] {
  const runs: string[] = [];
  let chars: number[] = [];

  const flush = () => {
    if (chars.length >= MIN_STRING_LENGTH) {
      runs.push(String.fromCharCode(...chars.slice(0, MAX_STRING_LENGTH)));
    }
    chars = [];
  };

  for (let i = 0; i + 1 < limit; i += 2) {
    const low = bytes[i]!;
    const high = bytes[i + 1]!;
    if (high === 0 && isPrintableAsciiByte(low)) {
      chars.push(low);
    } else {
      flush();
    }
  }
  flush();
  return runs;
}

export function extractStrings(bytes: Uint8Array): ExtractedString[] {
  const limit = Math.min(bytes.length, MAX_SCAN_BYTES);
  const rawRuns = [...extractAsciiRuns(bytes, limit), ...extractUtf16LeRuns(bytes, limit)];

  const seen = new Map<string, ExtractedString>();
  for (const value of rawRuns) {
    if (seen.has(value)) continue;
    const category = classify(value);
    seen.set(value, { value, category, score: scoreString(value, category) });
  }

  return Array.from(seen.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_EXTRACTED_STRINGS);
}
