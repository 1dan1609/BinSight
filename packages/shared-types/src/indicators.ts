import { z } from "zod";

/**
 * Shared schema for indicators extracted from a PE file by the client-side parser.
 * This is the ONLY thing that crosses the network to the backend — never the raw file.
 * Used identically on both sides: the frontend parser assembles it, the backend
 * re-validates it with `.strict()` before it ever touches a prompt.
 */

export const HashesSchema = z
  .object({
    md5: z.string().regex(/^[a-f0-9]{32}$/i),
    sha1: z.string().regex(/^[a-f0-9]{40}$/i),
    sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  })
  .strict();

export const FileHeaderSchema = z
  .object({
    isPE32Plus: z.boolean(),
    machine: z.string(),
    numberOfSections: z.number().int().nonnegative(),
    timeDateStamp: z.number().int().nonnegative(),
    characteristics: z.array(z.string()).max(64),
    subsystem: z.string(),
    dllCharacteristics: z.array(z.string()).max(64),
    entryPointAddress: z.number().int().nonnegative(),
    imageBase: z.number().nonnegative(),
    sizeOfImage: z.number().int().nonnegative(),
    // Full raw header fields, kept for the PEStudio-style "everything" dashboard view.
    majorLinkerVersion: z.number().int().nonnegative(),
    minorLinkerVersion: z.number().int().nonnegative(),
    sizeOfCode: z.number().int().nonnegative(),
    sizeOfInitializedData: z.number().int().nonnegative(),
    sizeOfUninitializedData: z.number().int().nonnegative(),
    baseOfCode: z.number().int().nonnegative(),
    sectionAlignment: z.number().int().nonnegative(),
    fileAlignment: z.number().int().nonnegative(),
    majorOperatingSystemVersion: z.number().int().nonnegative(),
    minorOperatingSystemVersion: z.number().int().nonnegative(),
    majorImageVersion: z.number().int().nonnegative(),
    minorImageVersion: z.number().int().nonnegative(),
    majorSubsystemVersion: z.number().int().nonnegative(),
    minorSubsystemVersion: z.number().int().nonnegative(),
    win32VersionValue: z.number().int().nonnegative(),
    sizeOfHeaders: z.number().int().nonnegative(),
    checkSum: z.number().int().nonnegative(),
    sizeOfStackReserve: z.number().nonnegative(),
    sizeOfStackCommit: z.number().nonnegative(),
    sizeOfHeapReserve: z.number().nonnegative(),
    sizeOfHeapCommit: z.number().nonnegative(),
    loaderFlags: z.number().int().nonnegative(),
    numberOfRvaAndSizes: z.number().int().nonnegative(),
  })
  .strict();

export const OverlaySchema = z
  .object({
    present: z.boolean(),
    offset: z.number().int().nonnegative(),
    size: z.number().int().nonnegative(),
    entropy: z.number().min(0).max(8),
  })
  .strict();

export const TlsInfoSchema = z
  .object({
    present: z.boolean(),
    callbackCount: z.number().int().nonnegative(),
    callbackAddresses: z.array(z.number().nonnegative()).max(64),
  })
  .strict();

export const DebugInfoSchema = z
  .object({
    hasDebugDirectory: z.boolean(),
    pdbPath: z.string().max(512).nullable(),
  })
  .strict();

export const RichHeaderEntrySchema = z
  .object({
    buildId: z.number().int().nonnegative(),
    productId: z.number().int().nonnegative(),
    count: z.number().int().nonnegative(),
  })
  .strict();

export const RichHeaderSchema = z
  .object({
    present: z.boolean(),
    xorKey: z.number().int().nonnegative(),
    entries: z.array(RichHeaderEntrySchema).max(128),
  })
  .strict();

export const SectionAnomalySchema = z.enum([
  "WRITABLE_AND_EXECUTABLE",
  "VIRTUAL_SIZE_EXCEEDS_RAW_SIZE",
  "HIGH_ENTROPY",
  "NON_STANDARD_NAME",
  "ZERO_RAW_SIZE_NONZERO_VIRTUAL_SIZE",
]);

export const SectionSchema = z
  .object({
    name: z.string().max(64),
    virtualSize: z.number().int().nonnegative(),
    virtualAddress: z.number().int().nonnegative(),
    rawSize: z.number().int().nonnegative(),
    rawAddress: z.number().int().nonnegative(),
    entropy: z.number().min(0).max(8),
    characteristics: z.array(z.string()).max(32),
    anomalies: z.array(SectionAnomalySchema).max(16),
  })
  .strict();

export const ImportSchema = z
  .object({
    dll: z.string().max(260),
    functions: z.array(z.string().max(260)).max(2000),
    ordinalOnlyCount: z.number().int().nonnegative(),
  })
  .strict();

export const ExportSchema = z
  .object({
    name: z.string().max(260),
    ordinal: z.number().int().nonnegative(),
  })
  .strict();

export const StringCategorySchema = z.enum([
  "URL",
  "IPV4",
  "EMAIL",
  "FILE_PATH",
  "REGISTRY_KEY",
  "SUSPICIOUS_KEYWORD",
  "OTHER",
]);

export const ExtractedStringSchema = z
  .object({
    value: z.string().max(1024),
    category: StringCategorySchema,
    score: z.number().min(0).max(1),
  })
  .strict();

export const HeuristicSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const HeuristicFindingSchema = z
  .object({
    id: z.string().max(128),
    severity: HeuristicSeveritySchema,
    description: z.string().max(512),
    relatedIndicator: z.string().max(256).optional(),
  })
  .strict();

/** Hard caps enforced by the client builder AND re-checked server-side. */
export const INDICATORS_LIMITS = {
  maxSections: 96,
  maxImportedDlls: 512,
  maxFunctionsPerDll: 2000,
  maxExports: 4000,
  maxStrings: 2000,
  maxHeuristics: 256,
  maxSerializedBytes: 200 * 1024, // 200KB
} as const;

export const IndicatorsJsonSchema = z
  .object({
    format: z.literal("pe"),
    schemaVersion: z.literal(2),
    fileSize: z.number().int().nonnegative(),
    hashes: HashesSchema,
    overallEntropy: z.number().min(0).max(8),
    header: FileHeaderSchema,
    sections: z.array(SectionSchema).max(INDICATORS_LIMITS.maxSections),
    imports: z.array(ImportSchema).max(INDICATORS_LIMITS.maxImportedDlls),
    exports: z.array(ExportSchema).max(INDICATORS_LIMITS.maxExports),
    strings: z.array(ExtractedStringSchema).max(INDICATORS_LIMITS.maxStrings),
    heuristics: z.array(HeuristicFindingSchema).max(INDICATORS_LIMITS.maxHeuristics),
    overlay: OverlaySchema,
    tls: TlsInfoSchema,
    debugInfo: DebugInfoSchema,
    richHeader: RichHeaderSchema,
    truncated: z.boolean(),
    parseWarnings: z.array(z.string().max(512)).max(64),
  })
  .strict();

export type Hashes = z.infer<typeof HashesSchema>;
export type FileHeader = z.infer<typeof FileHeaderSchema>;
export type Overlay = z.infer<typeof OverlaySchema>;
export type TlsInfo = z.infer<typeof TlsInfoSchema>;
export type DebugInfo = z.infer<typeof DebugInfoSchema>;
export type RichHeaderEntry = z.infer<typeof RichHeaderEntrySchema>;
export type RichHeader = z.infer<typeof RichHeaderSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type SectionAnomaly = z.infer<typeof SectionAnomalySchema>;
export type Import = z.infer<typeof ImportSchema>;
export type Export = z.infer<typeof ExportSchema>;
export type StringCategory = z.infer<typeof StringCategorySchema>;
export type ExtractedString = z.infer<typeof ExtractedStringSchema>;
export type HeuristicSeverity = z.infer<typeof HeuristicSeveritySchema>;
export type HeuristicFinding = z.infer<typeof HeuristicFindingSchema>;
export type IndicatorsJson = z.infer<typeof IndicatorsJsonSchema>;
