import type { ProviderName } from "@pe-analyzer/shared-types";

interface ProviderConfig {
  baseUrl: string;
  defaultModel: string;
}

/**
 * Hardcoded provider name -> base URL map. This is the SSRF control: a client
 * (hosted or BYOK) selects a `ProviderName` enum value and NEVER supplies a URL.
 */
/**
 * Every base URL here was verified to answer POST {baseUrl}/chat/completions (401/400 on an
 * invalid key rather than 404). `defaultModel` is only a fallback for callers that don't supply
 * one — model IDs drift far faster than endpoints do, so the UI exposes a model override and a
 * stale default is always recoverable without a deploy.
 */
export const PROVIDER_REGISTRY: Record<ProviderName, ProviderConfig> = {
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  // Reaches Claude, Gemini and most open models behind one OpenAI-compatible endpoint, which is
  // why none of them need a vendor-specific client here.
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
  },
  mistral: {
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
  },
  together: {
    baseUrl: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  },
  cerebras: {
    baseUrl: "https://api.cerebras.ai/v1",
    defaultModel: "llama-3.3-70b",
  },
  xai: {
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-2-latest",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
  },
};

export function resolveProviderConfig(provider: ProviderName): ProviderConfig {
  return PROVIDER_REGISTRY[provider];
}
