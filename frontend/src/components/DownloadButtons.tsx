import type { IndicatorsJson } from "@pe-analyzer/shared-types";

interface DownloadButtonsProps {
  indicators: IndicatorsJson;
  reportMarkdown?: string;
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function DownloadButtons({ indicators, reportMarkdown }: DownloadButtonsProps) {
  const baseName = indicators.hashes.sha256.slice(0, 12);

  return (
    <div className="download-buttons">
      {reportMarkdown && (
        <button
          type="button"
          onClick={() => downloadTextFile(`binsight-report-${baseName}.md`, reportMarkdown, "text/markdown")}
        >
          Download report (.md)
        </button>
      )}
      <button
        type="button"
        onClick={() =>
          downloadTextFile(
            `binsight-indicators-${baseName}.json`,
            JSON.stringify(indicators, null, 2),
            "application/json",
          )
        }
      >
        Download indicators (.json)
      </button>
    </div>
  );
}
