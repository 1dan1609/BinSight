import type { ProviderName } from "@pe-analyzer/shared-types";

interface ProviderConfig {
  baseUrl: string;
  defaultModel: string;
}

/**
 * Hardcoded provider name -> base URL map. This is the SSRF control: a client
 * (hosted or BYOK) selects a `ProviderName` enum value and NEVER supplies a URL.
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
};

export function resolveProviderConfig(provider: ProviderName): ProviderConfig {
  return PROVIDER_REGISTRY[provider];
}
