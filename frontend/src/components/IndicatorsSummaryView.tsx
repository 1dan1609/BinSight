import type { IndicatorsJson } from "@pe-analyzer/shared-types";

interface IndicatorsSummaryViewProps {
  indicators: IndicatorsJson;
}

const SEVERITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export default function IndicatorsSummaryView({ indicators }: IndicatorsSummaryViewProps) {
  const sortedHeuristics = [...indicators.heuristics].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  );
  const anomalousSections = indicators.sections.filter((s) => s.anomalies.length > 0);
  const flaggedStrings = indicators.strings.filter(
    (s) => s.category === "SUSPICIOUS_KEYWORD" || s.score >= 0.6,
  );

  return (
    <section className="indicators">
      {indicators.truncated && (
        <p className="banner banner--warning">
          Some data was truncated to stay within size limits — this file is unusually large or
          complex. The summary below reflects what was parsed.
        </p>
      )}
      {indicators.parseWarnings.length > 0 && (
        <details className="banner banner--warning">
          <summary>{indicators.parseWarnings.length} parse warning(s)</summary>
          <ul>
            {indicators.parseWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      {sortedHeuristics.length > 0 && (
        <div className="card">
          <h2>Flags</h2>
          <ul className="findings">
            {sortedHeuristics.map((h) => (
              <li key={h.id} className={`finding finding--${h.severity.toLowerCase()}`}>
                <span className="finding__severity">{h.severity}</span>
                <span>{h.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>File</h2>
        <dl className="kv">
          <dt>Size</dt>
          <dd>{indicators.fileSize.toLocaleString()} bytes</dd>
          <dt>SHA-256</dt>
          <dd className="mono">{indicators.hashes.sha256}</dd>
          <dt>SHA-1</dt>
          <dd className="mono">{indicators.hashes.sha1}</dd>
          <dt>MD5</dt>
          <dd className="mono">{indicators.hashes.md5}</dd>
          <dt>Overall entropy</dt>
          <dd>{indicators.overallEntropy.toFixed(2)} / 8</dd>
        </dl>
      </div>

      <div className="card">
        <h2>Header</h2>
        <dl className="kv">
          <dt>Format</dt>
          <dd>{indicators.header.isPE32Plus ? "PE32+ (64-bit)" : "PE32 (32-bit)"}</dd>
          <dt>Machine</dt>
          <dd>{indicators.header.machine}</dd>
          <dt>Subsystem</dt>
          <dd>{indicators.header.subsystem}</dd>
          <dt>Entry point</dt>
          <dd className="mono">0x{indicators.header.entryPointAddress.toString(16)}</dd>
          <dt>Image base</dt>
          <dd className="mono">0x{indicators.header.imageBase.toString(16)}</dd>
          <dt>Characteristics</dt>
          <dd>{indicators.header.characteristics.join(", ") || "—"}</dd>
          <dt>DLL characteristics</dt>
          <dd>{indicators.header.dllCharacteristics.join(", ") || "—"}</dd>
        </dl>
      </div>

      <div className="card">
        <h2>
          Sections ({indicators.sections.length}
          {anomalousSections.length > 0 ? `, ${anomalousSections.length} flagged` : ""})
        </h2>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Virtual size</th>
              <th>Raw size</th>
              <th>Entropy</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {indicators.sections.map((s, i) => (
              <tr key={i} className={s.anomalies.length > 0 ? "row--flagged" : ""}>
                <td className="mono">{s.name || "(unnamed)"}</td>
                <td>{s.virtualSize.toLocaleString()}</td>
                <td>{s.rawSize.toLocaleString()}</td>
                <td>{s.entropy.toFixed(2)}</td>
                <td>{s.anomalies.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Imports ({indicators.imports.length} DLLs)</h2>
        <ul className="imports">
          {indicators.imports.map((imp, i) => (
            <li key={i}>
              <span className="mono">{imp.dll}</span> — {imp.functions.length} function(s)
              {imp.ordinalOnlyCount > 0 && `, ${imp.ordinalOnlyCount} ordinal-only`}
            </li>
          ))}
        </ul>
      </div>

      {flaggedStrings.length > 0 && (
        <div className="card">
          <h2>Notable strings ({flaggedStrings.length})</h2>
          <ul className="strings">
            {flaggedStrings.slice(0, 100).map((s, i) => (
              <li key={i}>
                <span className={`string-tag string-tag--${s.category.toLowerCase()}`}>
                  {s.category}
                </span>
                <span className="mono">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
