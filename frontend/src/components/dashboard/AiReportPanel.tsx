import { Sparkles } from "lucide-react";
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
