import { Download } from "lucide-react";
import type { IndicatorsJson } from "@pe-analyzer/shared-types";
import { downloadTextFile } from "../lib/downloadTextFile";

export function DownloadIndicatorsButton({ indicators }: { indicators: IndicatorsJson }) {
  const baseName = indicators.hashes.sha256.slice(0, 12);
  return (
    <button
      type="button"
      className="secondary"
      onClick={() =>
        downloadTextFile(
          `binsight-indicators-${baseName}.json`,
          JSON.stringify(indicators, null, 2),
          "application/json",
        )
      }
    >
      <Download size={14} aria-hidden="true" style={{ marginRight: "0.4rem", verticalAlign: "-2px" }} />
      Download indicators (.json)
    </button>
  );
}

export function DownloadReportButton({
  indicators,
  reportMarkdown,
}: {
  indicators: IndicatorsJson;
  reportMarkdown: string;
}) {
  const baseName = indicators.hashes.sha256.slice(0, 12);
  return (
    <button
      type="button"
      className="secondary"
      onClick={() =>
        downloadTextFile(`binsight-report-${baseName}.md`, reportMarkdown, "text/markdown")
      }
    >
      <Download size={14} aria-hidden="true" style={{ marginRight: "0.4rem", verticalAlign: "-2px" }} />
      Download report (.md)
    </button>
  );
}
