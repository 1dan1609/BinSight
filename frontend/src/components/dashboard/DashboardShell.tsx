import { useState } from "react";
import type { ByokConfig, IndicatorsJson, ReportResponse } from "@pe-analyzer/shared-types";
import SectionNav from "./SectionNav";
import type { SectionId } from "./sections";
import AiReportPanel from "./AiReportPanel";
import FlagsPanel from "./panels/FlagsPanel";
import HeaderPanel from "./panels/HeaderPanel";
import OverviewPanel from "./panels/OverviewPanel";
import SectionsPanel from "./panels/SectionsPanel";
import ImportsExportsPanel from "./panels/ImportsExportsPanel";
import StringsPanel from "./panels/StringsPanel";
import { DebugInfoPanel, OverlayPanel, RichHeaderPanel, TlsPanel } from "./panels/AdvancedPanels";

type ReportState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "done"; report: ReportResponse }
  | { status: "error"; message: string };

interface DashboardShellProps {
  indicators: IndicatorsJson;
  reportState: ReportState;
  onGenerateReport: (mode: "hosted" | "byok", byokConfig?: ByokConfig) => void;
}

export default function DashboardShell({ indicators, reportState, onGenerateReport }: DashboardShellProps) {
  const [active, setActive] = useState<SectionId>("overview");

  return (
    <div className="app-shell__body">
      <SectionNav indicators={indicators} active={active} onSelect={setActive} />
      <div className="detail-panel">
        {active === "overview" && <OverviewPanel indicators={indicators} />}
        {active === "flags" && <FlagsPanel indicators={indicators} />}
        {active === "header" && <HeaderPanel indicators={indicators} />}
        {active === "sections" && <SectionsPanel indicators={indicators} />}
        {active === "imports-exports" && <ImportsExportsPanel indicators={indicators} />}
        {active === "strings" && <StringsPanel indicators={indicators} />}
        {active === "overlay" && <OverlayPanel indicators={indicators} />}
        {active === "tls" && <TlsPanel indicators={indicators} />}
        {active === "debug" && <DebugInfoPanel indicators={indicators} />}
        {active === "rich-header" && <RichHeaderPanel indicators={indicators} />}
        {active === "ai-report" && (
          <AiReportPanel indicators={indicators} reportState={reportState} onGenerate={onGenerateReport} />
        )}
      </div>
    </div>
  );
}
