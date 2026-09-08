import { INDICATORS_LIMITS, type IndicatorsJson } from "@pe-analyzer/shared-types";
import { calculateShannonEntropy } from "./entropyCalculator";
import { evaluateApiCombos } from "./heuristics";
import { calculateHashes } from "./hashCalculator";
import { parseExports, parseImports } from "./importExportWalker";
import { parsePeHeader } from "./peHeaderParser";
import { PEParseError, SafeReader } from "./safeReader";
import { parseSections } from "./sectionAnalyzer";
import { extractStrings } from "./stringExtractor";

export interface BuildIndicatorsResult {
  indicators: IndicatorsJson;
  errors: string[];
}

export async function buildIndicators(buffer: ArrayBuffer): Promise<BuildIndicatorsResult> {
  const warnings: string[] = [];
  const reader = new SafeReader(buffer);
  const fileBytes = new Uint8Array(buffer);

  const header = parsePeHeader(reader); // throws PEParseError for non-PE / malformed input — caller handles it

  const sections = parseSections(
    reader,
    header.sectionTableOffset,
    header.numberOfSections,
    header.pointerToSymbolTable,
    header.numberOfSymbols,
    warnings,
  );
  const imports = parseImports(reader, header.dataDirectories, sections, header.isPE32Plus, warnings);
  const exports = parseExports(reader, header.dataDirectories, sections, warnings);
  const strings = extractStrings(fileBytes);
  const hashes = await calculateHashes(fileBytes);
  const overallEntropy = calculateShannonEntropy(fileBytes);

  const importedFunctionNames = new Set<string>();
  for (const imp of imports) {
    for (const fn of imp.functions) importedFunctionNames.add(fn);
  }
  const heuristics = evaluateApiCombos(importedFunctionNames);

  let truncated = false;
  const cappedSections = sections.slice(0, INDICATORS_LIMITS.maxSections);
  if (sections.length > cappedSections.length) truncated = true;

  const cappedImports = imports.slice(0, INDICATORS_LIMITS.maxImportedDlls).map((imp) => {
    const cappedFns = imp.functions.slice(0, INDICATORS_LIMITS.maxFunctionsPerDll);
    if (cappedFns.length < imp.functions.length) truncated = true;
    return { ...imp, functions: cappedFns };
  });
  if (imports.length > cappedImports.length) truncated = true;

  const cappedExports = exports.slice(0, INDICATORS_LIMITS.maxExports);
  if (exports.length > cappedExports.length) truncated = true;

  const cappedStrings = strings.slice(0, INDICATORS_LIMITS.maxStrings);
  if (strings.length > cappedStrings.length) truncated = true;

  const cappedHeuristics = heuristics.slice(0, INDICATORS_LIMITS.maxHeuristics);

  const indicators: IndicatorsJson = {
    format: "pe",
    schemaVersion: 1,
    fileSize: buffer.byteLength,
    hashes,
    overallEntropy,
    header: {
      isPE32Plus: header.isPE32Plus,
      machine: header.machine,
      numberOfSections: header.numberOfSections,
      timeDateStamp: header.timeDateStamp,
      characteristics: header.characteristics,
      subsystem: header.subsystem,
      dllCharacteristics: header.dllCharacteristics,
      entryPointAddress: header.entryPointAddress,
      imageBase: header.imageBase,
      sizeOfImage: header.sizeOfImage,
    },
    sections: cappedSections,
    imports: cappedImports,
    exports: cappedExports,
    strings: cappedStrings,
    heuristics: cappedHeuristics,
    truncated,
    parseWarnings: warnings.slice(0, 64),
  };

  const serializedSize = new TextEncoder().encode(JSON.stringify(indicators)).length;
  if (serializedSize > INDICATORS_LIMITS.maxSerializedBytes) {
    // Fall back to a minimal payload rather than dropping arbitrary fields inconsistently.
    indicators.strings = [];
    indicators.imports = cappedImports.map((imp) => ({ ...imp, functions: imp.functions.slice(0, 20) }));
    indicators.truncated = true;
    indicators.parseWarnings.push("Indicators payload exceeded size cap; strings and most imports were dropped");
  }

  return { indicators, errors: [] };
}

export { PEParseError };
