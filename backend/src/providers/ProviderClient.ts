export interface PromptPair {
  system: string;
  user: string;
}

export interface ProviderResult {
  content: string;
  modelUsed: string;
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
