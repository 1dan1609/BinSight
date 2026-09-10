import { FilePlus, Github, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { ByokConfig, IndicatorsJson, ReportResponse } from "@pe-analyzer/shared-types";
import { requestReport } from "./api/reportClient";
import DashboardShell from "./components/dashboard/DashboardShell";
import { DownloadIndicatorsButton } from "./components/DownloadButtons";
import FileDropzone from "./components/FileDropzone";
import { runParser } from "./parser/runParser";

type ParseState =
  | { status: "idle" }
  | { status: "parsing" }
  | { status: "parsed"; indicators: IndicatorsJson }
  | { status: "error"; message: string };

type ReportState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "done"; report: ReportResponse }
  | { status: "error"; message: string };

export default function App() {
  const [parseState, setParseState] = useState<ParseState>({ status: "idle" });
  const [reportState, setReportState] = useState<ReportState>({ status: "idle" });

  async function handleFileSelected(file: File) {
    setReportState({ status: "idle" });
    setParseState({ status: "parsing" });
    try {
      const indicators = await runParser(file);
      setParseState({ status: "parsed", indicators });
    } catch (err) {
      setParseState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to parse file",
      });
    }
  }

  function handleReset() {
    setParseState({ status: "idle" });
    setReportState({ status: "idle" });
  }

  async function handleGenerateReport(mode: "hosted" | "byok", byokConfig?: ByokConfig) {
    if (parseState.status !== "parsed") return;
    setReportState({ status: "generating" });
    try {
      const report = await requestReport(parseState.indicators, mode, byokConfig);
      setReportState({ status: "done", report });
    } catch (err) {
      setReportState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to generate report",
      });
    }
  }

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__brand">
          <h1>BinSight</h1>
          <a
            className="app-shell__github"
            href="https://github.com/1dan1609/BinSight"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
          >
            <Github size={15} aria-hidden="true" />
          </a>
        </div>
        <div className="app-shell__trust">
          <ShieldCheck size={15} aria-hidden="true" />
          {parseState.status === "parsed"
            ? "This file was parsed entirely in your browser, and it was never uploaded"
            : "Files are parsed entirely in your browser, and never uploaded"}
        </div>
        {parseState.status === "parsed" && (
          <div className="app-shell__actions">
            <button type="button" className="secondary" onClick={handleReset}>
              <FilePlus size={14} aria-hidden="true" style={{ marginRight: "0.4rem", verticalAlign: "-2px" }} />
              Analyze another file
            </button>
            <DownloadIndicatorsButton indicators={parseState.indicators} />
          </div>
        )}
      </header>

      {parseState.status !== "parsed" ? (
        <div className="empty-state">
          <div className="empty-state__inner">
            <FileDropzone onFileSelected={handleFileSelected} disabled={parseState.status === "parsing"} />
            {parseState.status === "parsing" && (
              <p className="status" style={{ marginTop: "1rem", justifyContent: "center" }}>
                Parsing file…
              </p>
            )}
            {parseState.status === "error" && (
              <p className="banner banner--error" style={{ marginTop: "1rem" }}>
                Couldn&apos;t parse this file: {parseState.message}
              </p>
            )}
          </div>
        </div>
      ) : (
        <DashboardShell
          indicators={parseState.indicators}
          reportState={reportState}
          onGenerateReport={handleGenerateReport}
        />
      )}
    </div>
  );
}
