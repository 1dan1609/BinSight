import { AlertTriangle, Sparkles } from "lucide-react";
import type { ByokConfig, IndicatorsJson, ReportResponse } from "@pe-analyzer/shared-types";
import { DownloadReportButton } from "../DownloadButtons";
import ProviderSelector from "../ProviderSelector";
import ReportView from "../ReportView";

type ReportState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "done"; report: ReportResponse }
  | { status: "error"; message: string };

interface AiReportPanelProps {
  indicators: IndicatorsJson;
  reportState: ReportState;
  onGenerate: (mode: "hosted" | "byok", byokConfig?: ByokConfig) => void;
}

export default function AiReportPanel({ indicators, reportState, onGenerate }: AiReportPanelProps) {
  return (
    <div>
      <div className="panel-header">
        <h2>
          <Sparkles size={18} aria-hidden="true" color="var(--ai-accent)" />
          AI Report
        </h2>
        <p>Not core to the analysis above — a generated summary layered on top of it.</p>
      </div>

      <div className="ai-panel">
        <div className="ai-panel__badge">
          <Sparkles size={13} aria-hidden="true" />
          AI-generated
        </div>

        <ProviderSelector onGenerate={onGenerate} disabled={reportState.status === "generating"} />

        {reportState.status === "error" && (
          <p className="banner banner--error" style={{ marginTop: "1rem" }}>
            Report generation failed: {reportState.message}
          </p>
        )}

        {reportState.status === "done" && (
          <>
            {/* A report cut off at the model's output limit still reads as a finished document,
                so the warning has to be visible above it rather than only present in the API
                response. */}
            {reportState.report.warnings?.map((warning) => (
              <p key={warning} className="banner banner--warning" style={{ marginTop: "1rem" }}>
                <AlertTriangle size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
                {warning}
              </p>
            ))}
            <ReportView
              markdown={reportState.report.markdown}
              generatedAt={reportState.report.generatedAt}
              modelUsed={reportState.report.modelUsed}
            />
            <div style={{ marginTop: "1rem" }}>
              <DownloadReportButton indicators={indicators} reportMarkdown={reportState.report.markdown} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
