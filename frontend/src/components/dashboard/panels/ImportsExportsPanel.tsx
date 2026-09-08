import { ChevronRight } from "lucide-react";
import type { IndicatorsJson } from "@pe-analyzer/shared-types";

export default function ImportsExportsPanel({ indicators }: { indicators: IndicatorsJson }) {
  return (
    <div>
      <div className="panel-header">
        <h2>Imports / Exports</h2>
        <p>
          {indicators.imports.length} imported DLL(s) · {indicators.exports.length} export(s)
        </p>
      </div>

      <div className="panel-section">
        <h3>Imports</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {indicators.imports.map((imp, i) => (
            <details key={i} className="import-group">
              <summary className="import-group__summary">
                <ChevronRight size={14} className="import-group__chevron" aria-hidden="true" />
                <span className="mono">{imp.dll}</span>
                <span className="import-group__count">
                  {imp.functions.length} function(s)
                  {imp.ordinalOnlyCount > 0 && `, ${imp.ordinalOnlyCount} ordinal-only`}
                </span>
              </summary>
              <ul className="import-group__functions">
                {imp.functions.map((fn) => (
                  <li key={fn} className="mono">
                    {fn}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>

      {indicators.exports.length > 0 && (
        <div className="panel-section">
          <h3>Exports</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ordinal</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {indicators.exports.map((exp, i) => (
                <tr key={i}>
                  <td className="mono">{exp.ordinal}</td>
                  <td className="mono">{exp.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
