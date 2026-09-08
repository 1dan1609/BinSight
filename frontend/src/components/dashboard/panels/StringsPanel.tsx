import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { IndicatorsJson, StringCategory } from "@pe-analyzer/shared-types";

const CATEGORY_LABELS: Record<StringCategory | "ALL", string> = {
  ALL: "All categories",
  URL: "URL",
  IPV4: "IPv4",
  EMAIL: "Email",
  FILE_PATH: "File path",
  REGISTRY_KEY: "Registry key",
  SUSPICIOUS_KEYWORD: "Suspicious keyword",
  OTHER: "Other",
};

export default function StringsPanel({ indicators }: { indicators: IndicatorsJson }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<StringCategory | "ALL">("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return indicators.strings
      .filter((s) => category === "ALL" || s.category === category)
      .filter((s) => q.length === 0 || s.value.toLowerCase().includes(q));
  }, [indicators.strings, query, category]);

  return (
    <div>
      <div className="panel-header">
        <h2>Strings</h2>
        <p>
          {filtered.length} of {indicators.strings.length} extracted string(s)
        </p>
      </div>

      <div className="strings-toolbar">
        <div className="strings-search">
          <Search size={14} aria-hidden="true" />
          <input
            type="text"
            placeholder="Filter strings…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter strings"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as StringCategory | "ALL")}
          aria-label="Filter by category"
        >
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="empty-panel">No strings match this filter.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map((s, i) => (
              <tr key={i}>
                <td>
                  <span className={`tag ${s.category === "SUSPICIOUS_KEYWORD" ? "tag--flag" : ""}`}>
                    {CATEGORY_LABELS[s.category]}
                  </span>
                </td>
                <td className="mono" style={{ wordBreak: "break-all" }}>
                  {s.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {filtered.length > 500 && (
        <p className="hint" style={{ marginTop: "0.75rem" }}>
          Showing the first 500 of {filtered.length} matches — narrow the filter to see more.
        </p>
      )}
    </div>
  );
}
