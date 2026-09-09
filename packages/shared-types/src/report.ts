import { z } from "zod";
import { IndicatorsJsonSchema } from "./indicators.js";

/** Contract for POST /api/v1/report — the only backend endpoint. Fully stateless. */

/**
 * Every entry must expose an OpenAI-compatible POST {baseUrl}/chat/completions, since one client
 * (OpenAICompatibleProvider) serves all of them — that single code path is what keeps the
 * security review surface small. A provider needing its own request/response shape does not
 * belong here; Claude and Gemini are reachable through openrouter for exactly that reason.
 *
 * This enum is also the SSRF control: callers pick a name, never a URL.
 */
export const ProviderNameSchema = z.enum([
  "groq",
  "openai",
  "openrouter",
  "mistral",
  "deepseek",
  "together",
  "cerebras",
  "xai",
  "gemini",
]);

export const ByokConfigSchema = z
  .object({
    provider: ProviderNameSchema,
    apiKey: z.string().min(1).max(512),
    model: z.string().max(128).optional(),
  })
  .strict();

export const ReportRequestSchema = z
  .object({
    indicators: IndicatorsJsonSchema,
    mode: z.enum(["hosted", "byok"]),
    byokConfig: ByokConfigSchema.optional(),
  })
  .strict()
  .refine((val) => val.mode !== "byok" || val.byokConfig !== undefined, {
    message: "byokConfig is required when mode is 'byok'",
    path: ["byokConfig"],
  });

export const ReportResponseSchema = z
  .object({
    markdown: z.string(),
    generatedAt: z.string(),
    modelUsed: z.string(),
    warnings: z.array(z.string()).optional(),
  })
  .strict();

export const ReportErrorCodeSchema = z.enum([
  "RATE_LIMITED",
  "INVALID_PAYLOAD",
  "PAYLOAD_TOO_LARGE",
  "DAILY_QUOTA_EXCEEDED",
  "PROVIDER_ERROR",
]);

export const ReportErrorResponseSchema = z
  .object({
    code: ReportErrorCodeSchema,
    message: z.string(),
  })
  .strict();

export type ProviderName = z.infer<typeof ProviderNameSchema>;
export type ByokConfig = z.infer<typeof ByokConfigSchema>;
export type ReportRequest = z.infer<typeof ReportRequestSchema>;
export type ReportResponse = z.infer<typeof ReportResponseSchema>;
export type ReportErrorResponse = z.infer<typeof ReportErrorResponseSchema>;
