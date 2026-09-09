import type { PromptPair, ProviderClient, ProviderResult } from "./ProviderClient.js";
import { ProviderError } from "./ProviderClient.js";

interface OpenAICompatibleProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface ChatCompletionResponse {
  model?: string;
  choices?: { message?: { content?: string }; finish_reason?: string }[];
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
          // Two competing constraints. Reasoning models (the hosted default is one) draw on this
          // budget for reasoning tokens before emitting content, and exhausting it surfaces as an
          // empty completion rather than an error — so it can't be too low. But Groq's free tier
          // counts prompt + completion against one 8000 TPM ceiling, so it can't be too high
          // either: 4000 put a routine request at 8714 tokens and got it rejected with a 413.
          max_tokens: 2500,
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
      // Capacity errors get a mapped message rather than the provider's raw text: that text is
      // both unactionable for an end user and carries account identifiers (Groq embeds the
      // organization ID and a billing link in its 413), which should not reach the browser.
      // Other statuses keep the provider's message — "the model does not exist" and similar are
      // exactly what a BYOK user needs to see to fix their own configuration.
      if (response.status === 413 || response.status === 429) {
        throw new ProviderError(
          "The AI provider rejected this request as too large or too frequent. This usually means " +
            "the free-tier token-per-minute limit was hit — wait a minute and retry, or use your " +
            "own API key for a higher limit.",
        );
      }
      if (response.status === 401 || response.status === 403) {
        throw new ProviderError("The AI provider rejected the API key.");
      }
      const body = await response.text().catch(() => "");
      throw new ProviderError(`Provider request failed (${response.status}): ${body.slice(0, 500)}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new ProviderError("Provider returned an empty completion");
    }

    return {
      content,
      modelUsed: data.model ?? this.options.model,
      hitTokenLimit: data.choices?.[0]?.finish_reason === "length",
    };
  }
}
