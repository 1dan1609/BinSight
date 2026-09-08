import type { IndicatorsJson } from "@pe-analyzer/shared-types";

export default function SectionsPanel({ indicators }: { indicators: IndicatorsJson }) {
  const flaggedCount = indicators.sections.filter((s) => s.anomalies.length > 0).length;

  return (
    <div>
      <div className="panel-header">
        <h2>Sections</h2>
        <p>
          {indicators.sections.length} section(s){flaggedCount > 0 && `, ${flaggedCount} flagged`}
        </p>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Virtual Address</th>
              <th>Virtual Size</th>
              <th>Raw Address</th>
              <th>Raw Size</th>
              <th>Entropy</th>
              <th>Characteristics</th>
              <th>Anomalies</th>
            </tr>
          </thead>
          <tbody>
            {indicators.sections.map((s, i) => (
              <tr key={i} className={s.anomalies.length > 0 ? "row--flagged" : ""}>
                <td className="mono">{s.name || "(unnamed)"}</td>
                <td className="mono">0x{s.virtualAddress.toString(16)}</td>
                <td>{s.virtualSize.toLocaleString()}</td>
                <td className="mono">0x{s.rawAddress.toString(16)}</td>
                <td>{s.rawSize.toLocaleString()}</td>
                <td>{s.entropy.toFixed(2)}</td>
                <td>
                  {s.characteristics.slice(0, 3).map((c) => (
                    <span key={c} className="tag">
                      {c}
                    </span>
                  ))}
                </td>
                <td>
                  {s.anomalies.map((a) => (
                    <span key={a} className="tag tag--flag">
                      {a}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
