import type { IndicatorsJson } from "@pe-analyzer/shared-types";
import type { ParseRequestMessage, ParseResponseMessage } from "./peParser.worker";

const PARSE_TIMEOUT_MS = 15_000;

/**
 * Matches stringExtractor's MAX_SCAN_BYTES: past this point string extraction is truncated
 * anyway, so a larger file buys degraded analysis at real memory cost. The whole file is held
 * in memory (File.arrayBuffer) and hashing needs a second copy, so peak usage is a multiple of
 * this — without a cap, a large enough file OOMs the tab before any parser code runs.
 */
export const MAX_FILE_BYTES = 64 * 1024 * 1024;

export class ParseTimeoutError extends Error {
  constructor() {
    super(`PE parsing timed out after ${PARSE_TIMEOUT_MS}ms`);
    this.name = "ParseTimeoutError";
  }
}

export class FileTooLargeError extends Error {
  constructor(actualBytes: number) {
    const mib = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);
    super(`File is ${mib(actualBytes)} MiB, above the ${mib(MAX_FILE_BYTES)} MiB limit`);
    this.name = "FileTooLargeError";
  }
}

/**
 * Runs the PE parser in a Web Worker and owns the wall-clock timeout: a worker
 * cannot reliably self-interrupt a true infinite loop, so the kill switch has
 * to live here, on the main thread, via terminate().
 */
export function runParser(file: File): Promise<IndicatorsJson> {
  return new Promise((resolve, reject) => {
    // Checked before spawning the worker or touching arrayBuffer(): the timeout below cannot
    // save us here, since it rejects the promise while the oversized allocation proceeds anyway.
    if (file.size > MAX_FILE_BYTES) {
      reject(new FileTooLargeError(file.size));
      return;
    }

    const worker = new Worker(new URL("./peParser.worker.ts", import.meta.url), {
      type: "module",
    });

    const timeoutId = setTimeout(() => {
      worker.terminate();
      reject(new ParseTimeoutError());
    }, PARSE_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeoutId);
      worker.terminate();
    };

    worker.onmessage = (event: MessageEvent<ParseResponseMessage>) => {
      cleanup();
      if (event.data.type === "result") {
        resolve(event.data.indicators);
      } else {
        reject(new Error(event.data.message));
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      cleanup();
      reject(new Error(event.message || "PE parser worker crashed"));
    };

    file
      .arrayBuffer()
      .then((buffer) => {
        const message: ParseRequestMessage = { type: "parse", buffer };
        worker.postMessage(message, [buffer]);
      })
      .catch((err: unknown) => {
        cleanup();
        reject(err instanceof Error ? err : new Error("Failed to read file"));
      });
  });
}
