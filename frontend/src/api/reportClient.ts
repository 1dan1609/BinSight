import type { ByokConfig, IndicatorsJson, ReportErrorResponse, ReportResponse } from "@pe-analyzer/shared-types";

export class ReportRequestError extends Error {
  constructor(
    message: string,
    public readonly code: ReportErrorResponse["code"] | "NETWORK_ERROR",
  ) {
    super(message);
    this.name = "ReportRequestError";
  }
}

export async function requestReport(
  indicators: IndicatorsJson,
  mode: "hosted" | "byok",
  byokConfig?: ByokConfig,
): Promise<ReportResponse> {
  let response: Response;
  try {
    response = await fetch("/api/v1/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ indicators, mode, byokConfig }),
    });
  } catch {
    throw new ReportRequestError("Could not reach the report service. Check your connection.", "NETWORK_ERROR");
  }

  const body = await response.json();
  if (!response.ok) {
    const errorBody = body as ReportErrorResponse;
    throw new ReportRequestError(errorBody.message ?? "Report generation failed", errorBody.code);
  }
  return body as ReportResponse;
}
