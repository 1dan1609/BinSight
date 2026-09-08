import { useState } from "react";
import type { ByokConfig, IndicatorsJson, ReportResponse } from "@pe-analyzer/shared-types";
import { requestReport } from "./api/reportClient";
import DownloadButtons from "./components/DownloadButtons";
import FileDropzone from "./components/FileDropzone";
import IndicatorsSummaryView from "./components/IndicatorsSummaryView";
import ProviderSelector from "./components/ProviderSelector";
import ReportView from "./components/ReportView";
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
    <main className="app">
      <header className="app__header">
        <h1>BinSight</h1>
        <p>
          Static analysis for Windows PE files. Parsing runs entirely in your browser — the file
          never leaves your machine.
        </p>
      </header>

      <FileDropzone onFileSelected={handleFileSelected} disabled={parseState.status === "parsing"} />

      {parseState.status === "parsing" && <p className="status">Parsing file…</p>}
      {parseState.status === "error" && (
        <p className="banner banner--error">Couldn&apos;t parse this file: {parseState.message}</p>
      )}

      {parseState.status === "parsed" && (
        <>
          <IndicatorsSummaryView indicators={parseState.indicators} />

          <ProviderSelector
            onGenerate={handleGenerateReport}
            disabled={reportState.status === "generating"}
          />

          {reportState.status === "error" && (
            <p className="banner banner--error">Report generation failed: {reportState.message}</p>
          )}

          {reportState.status === "done" && (
            <ReportView
              markdown={reportState.report.markdown}
              generatedAt={reportState.report.generatedAt}
              modelUsed={reportState.report.modelUsed}
            />
          )}

          <DownloadButtons
            indicators={parseState.indicators}
            reportMarkdown={reportState.status === "done" ? reportState.report.markdown : undefined}
          />
        </>
      )}
    </main>
  );
}
