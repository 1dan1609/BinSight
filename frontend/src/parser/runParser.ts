import type { IndicatorsJson } from "@pe-analyzer/shared-types";
import type { ParseRequestMessage, ParseResponseMessage } from "./peParser.worker";

const PARSE_TIMEOUT_MS = 15_000;

export class ParseTimeoutError extends Error {
  constructor() {
    super(`PE parsing timed out after ${PARSE_TIMEOUT_MS}ms`);
    this.name = "ParseTimeoutError";
  }
}

/**
 * Runs the PE parser in a Web Worker and owns the wall-clock timeout: a worker
 * cannot reliably self-interrupt a true infinite loop, so the kill switch has
 * to live here, on the main thread, via terminate().
 */
export function runParser(file: File): Promise<IndicatorsJson> {
  return new Promise((resolve, reject) => {
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
