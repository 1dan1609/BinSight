import { buildIndicators, PEParseError } from "./indicatorsBuilder";

export interface ParseRequestMessage {
  type: "parse";
  buffer: ArrayBuffer;
}

export type ParseResponseMessage =
  | { type: "result"; indicators: Awaited<ReturnType<typeof buildIndicators>>["indicators"] }
  | { type: "error"; message: string };

self.onmessage = async (event: MessageEvent<ParseRequestMessage>) => {
  const { data } = event;
  if (data.type !== "parse") return;

  try {
    const { indicators } = await buildIndicators(data.buffer);
    const response: ParseResponseMessage = { type: "result", indicators };
    self.postMessage(response);
  } catch (error) {
    const message =
      error instanceof PEParseError
        ? error.message
        : error instanceof Error
          ? `Unexpected parser error: ${error.message}`
          : "Unexpected parser error";
    const response: ParseResponseMessage = { type: "error", message };
    self.postMessage(response);
  }
};
