import type { PromptPair, ProviderClient, ProviderResult } from "./ProviderClient.js";
import { ProviderError } from "./ProviderClient.js";

interface OpenAICompatibleProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface ChatCompletionResponse {
  model?: string;
  choices?: { message?: { content?: string } }[];
}

const PROVIDER_TIMEOUT_MS = 60_000;

/**
 * Generic client for any OpenAI-compatible /chat/completions API (Groq, OpenAI, and most
 * other free/cheap providers all expose this shape). Used for both the hosted-key path
 * (server's own key, Groq's base URL) and BYOK (user's key, an allow-listed base URL) —
 * one HTTP code path for both, which keeps the security review surface small.
 */
export class OpenAICompatibleProvider implements ProviderClient {
  constructor(private readonly options: OpenAICompatibleProviderOptions) {}

  async generateReport(prompt: PromptPair): Promise<ProviderResult> {
    let response: Response;
    try {
      response = await fetch(`${this.options.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
        // Node's fetch has no default timeout: without this a hung upstream pins the request
        // (and its rate-limit slot) open indefinitely.
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });
    } catch (err) {
      if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
        throw new ProviderError(`Provider did not respond within ${PROVIDER_TIMEOUT_MS / 1000}s`);
      }
      throw new ProviderError(
        `Provider request failed: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new ProviderError(`Provider request failed (${response.status}): ${body.slice(0, 500)}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new ProviderError("Provider returned an empty completion");
    }

    return { content, modelUsed: data.model ?? this.options.model };
  }
}
