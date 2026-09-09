export interface PromptPair {
  system: string;
  user: string;
}

export interface ProviderResult {
  content: string;
  modelUsed: string;
  /** True when the model stopped because it hit max_tokens, so the report is cut off mid-thought. */
  hitTokenLimit: boolean;
}

export interface ProviderClient {
  generateReport(prompt: PromptPair): Promise<ProviderResult>;
}

export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderError";
  }
}
