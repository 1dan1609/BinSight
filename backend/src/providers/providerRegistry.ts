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
    // llama-3.3-70b-versatile was retired from Groq's catalog and started returning 404, which
    // took hosted mode down. Picked by testing every chat-capable model Groq currently lists:
    // groq/compound answered confidently but wrongly (it read "TLS callback" as a TLS handshake
    // rather than Thread Local Storage), which is worse than an outage in a malware report.
    defaultModel: "openai/gpt-oss-120b",
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
    // gemini-2.0-flash was retired; Google's API now serves a 4xx pointing callers at
    // gemini-3.6-flash instead of a 404, so this one surfaced as a user-facing "provider
    // rejected" error rather than an outage. See groq's defaultModel comment above for the
    // same class of problem (model IDs rot faster than this file gets touched).
    defaultModel: "gemini-3.6-flash",
  },
};

export function resolveProviderConfig(provider: ProviderName): ProviderConfig {
  return PROVIDER_REGISTRY[provider];
}
