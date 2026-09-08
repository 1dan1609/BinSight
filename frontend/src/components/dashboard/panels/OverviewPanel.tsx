import type { IndicatorsJson } from "@pe-analyzer/shared-types";
import SeverityPill from "../SeverityPill";

export default function OverviewPanel({ indicators }: { indicators: IndicatorsJson }) {
  const topFindings = [...indicators.heuristics]
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "HIGH" ? -1 : 1))
    .slice(0, 5);

  return (
    <div>
      <div className="panel-header">
        <h2>Overview</h2>
        <p>First-pass triage summary — every section on the left drills into full raw data.</p>
      </div>

      <div className="panel-section">
        <h3>File</h3>
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

      <div className="panel-section">
        <h3>Format</h3>
        <dl className="kv">
          <dt>Architecture</dt>
          <dd>
            {indicators.header.isPE32Plus ? "PE32+ (64-bit)" : "PE32 (32-bit)"} · {indicators.header.machine}
          </dd>
          <dt>Subsystem</dt>
          <dd>{indicators.header.subsystem}</dd>
          <dt>Sections</dt>
          <dd>{indicators.sections.length}</dd>
          <dt>Imports</dt>
          <dd>{indicators.imports.length} DLL(s)</dd>
        </dl>
      </div>

      {topFindings.length > 0 && (
        <div className="panel-section">
          <h3>Top flags</h3>
          <ul className="finding-list">
            {topFindings.map((f) => (
              <li key={f.id} className="finding">
                <SeverityPill severity={f.severity} />
                <div className="finding__body">
                  <span>{f.description}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {indicators.truncated && (
        <p className="banner banner--warning">
          Some data was truncated to stay within size limits — this file is unusually large or
          complex.
        </p>
      )}
    </div>
  );
}
