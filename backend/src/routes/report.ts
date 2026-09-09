import { ReportRequestSchema, type ReportErrorResponse, type ReportResponse } from "@pe-analyzer/shared-types";
import type { FastifyInstance } from "fastify";
import type { DailyQuota } from "../lib/dailyQuota.js";
import { OpenAICompatibleProvider } from "../providers/OpenAICompatibleProvider.js";
import { ProviderError, type ProviderClient } from "../providers/ProviderClient.js";
import { createGroqHostedProvider } from "../providers/GroqHostedProvider.js";
import { resolveProviderConfig } from "../providers/providerRegistry.js";
import { buildReportPrompt } from "../services/promptBuilder.js";
import { sanitizeReport } from "../services/reportSanitizer.js";

function sendError(
  reply: import("fastify").FastifyReply,
  status: number,
  code: ReportErrorResponse["code"],
  message: string,
): void {
  const body: ReportErrorResponse = { code, message };
  void reply.status(status).send(body);
}

export async function registerReportRoute(app: FastifyInstance, dailyQuota: DailyQuota): Promise<void> {
  app.post("/api/v1/report", async (request, reply) => {
    const parsed = ReportRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "INVALID_PAYLOAD", parsed.error.message);
    }
    const { indicators, mode, byokConfig } = parsed.data;

    if (mode === "hosted") {
      const quota = dailyQuota.tryConsume();
      if (!quota.allowed) {
        request.log.warn({ count: quota.count, max: quota.max }, "Hosted-mode daily quota exceeded");
        return sendError(
          reply,
          429,
          "DAILY_QUOTA_EXCEEDED",
          "The free hosted-mode daily quota has been reached. Try again tomorrow, or use your own API key.",
        );
      }
    }

    let provider: ProviderClient;
    try {
      if (mode === "hosted") {
        provider = createGroqHostedProvider();
      } else {
        // byokConfig is guaranteed present by the schema's refine() when mode === "byok".
        const { provider: providerName, apiKey, model } = byokConfig!;
        const { baseUrl, defaultModel } = resolveProviderConfig(providerName);
        provider = new OpenAICompatibleProvider({ baseUrl, apiKey, model: model ?? defaultModel });
      }
    } catch (err) {
      request.log.error({ err }, "Failed to construct AI provider");
      return sendError(reply, 503, "PROVIDER_ERROR", "The selected AI provider is unavailable");
    }

    const prompt = buildReportPrompt(indicators);

    try {
      const result = await provider.generateReport(prompt);
      const sanitized = sanitizeReport(result.content);

      const warnings: string[] = [];
      if (result.hitTokenLimit) {
        warnings.push(
          "The model reached its output limit, so this report is cut off before the final section.",
        );
      }
      if (sanitized.truncated) {
        warnings.push("Report was truncated to the maximum allowed length");
      }

      const body: ReportResponse = {
        markdown: sanitized.markdown,
        generatedAt: new Date().toISOString(),
        modelUsed: result.modelUsed,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
      return reply.status(200).send(body);
    } catch (err) {
      if (err instanceof ProviderError) {
        request.log.warn({ err }, "Provider request failed");
        return sendError(reply, 502, "PROVIDER_ERROR", err.message);
      }
      request.log.error({ err }, "Unexpected error generating report");
      return sendError(reply, 500, "PROVIDER_ERROR", "Unexpected error generating report");
    }
  });
}
