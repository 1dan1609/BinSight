import { env } from "../config/env.js";
import { OpenAICompatibleProvider } from "./OpenAICompatibleProvider.js";
import type { ProviderClient } from "./ProviderClient.js";
import { PROVIDER_REGISTRY } from "./providerRegistry.js";

/** The zero-friction default path: the server's own Groq key, never exposed to the client. */
export function createGroqHostedProvider(): ProviderClient {
  if (!env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured; hosted mode is unavailable");
  }
  const { baseUrl, defaultModel } = PROVIDER_REGISTRY.groq;
  return new OpenAICompatibleProvider({ baseUrl, apiKey: env.GROQ_API_KEY, model: defaultModel });
}
