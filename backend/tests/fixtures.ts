import type { IndicatorsJson } from "@pe-analyzer/shared-types";

export const MINIMAL_INDICATORS: IndicatorsJson = {
  format: "pe",
  schemaVersion: 1,
  fileSize: 44911,
  hashes: {
    md5: "486dc204ee41472e24b4398765e2e66c",
    sha1: "46865cc49407346774aedb034f4b39ca78bee8ed",
    sha256: "84b2dbf4b7eca104de404d9596fa7f1f81ad1cf79caada9a36114ba3d90eea22",
  },
  overallEntropy: 5.2,
  header: {
    isPE32Plus: false,
    machine: "I386",
    numberOfSections: 1,
    timeDateStamp: 1_700_000_000,
    characteristics: ["EXECUTABLE_IMAGE"],
    subsystem: "WINDOWS_CUI",
    dllCharacteristics: [],
    entryPointAddress: 0x1000,
    imageBase: 0x400000,
    sizeOfImage: 0x10000,
  },
  sections: [
    {
      name: ".text",
      virtualSize: 0x1000,
      virtualAddress: 0x1000,
      rawSize: 0x1000,
      rawAddress: 0x400,
      entropy: 6.1,
      characteristics: ["CODE", "MEM_EXECUTE", "MEM_READ"],
      anomalies: [],
    },
  ],
  imports: [{ dll: "KERNEL32.dll", functions: ["ExitProcess"], ordinalOnlyCount: 0 }],
  exports: [],
  strings: [{ value: "hello world", category: "OTHER", score: 0.1 }],
  heuristics: [],
  truncated: false,
  parseWarnings: [],
};
