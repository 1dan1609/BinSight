import { CheckCircle2 } from "lucide-react";
import type { IndicatorsJson } from "@pe-analyzer/shared-types";
import SeverityPill from "../SeverityPill";

const SEVERITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export default function FlagsPanel({ indicators }: { indicators: IndicatorsJson }) {
  const findings = [...indicators.heuristics].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  );

  return (
    <div>
      <div className="panel-header">
        <h2>Flags</h2>
        <p>Heuristic findings from static analysis — not a malware verdict, a starting point.</p>
      </div>

      {findings.length === 0 ? (
        <div className="empty-panel">
          <CheckCircle2 size={16} aria-hidden="true" />
          No heuristic flags triggered by this file's static structure.
        </div>
      ) : (
        <ul className="finding-list">
          {findings.map((f) => (
            <li key={f.id} className="finding">
              <SeverityPill severity={f.severity} />
              <div className="finding__body">
                <span>{f.description}</span>
                {f.relatedIndicator && (
                  <span className="finding__indicator mono">{f.relatedIndicator}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
