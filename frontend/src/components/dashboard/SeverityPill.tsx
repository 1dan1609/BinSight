import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import type { HeuristicSeverity } from "@pe-analyzer/shared-types";

const SEVERITY_CONFIG: Record<HeuristicSeverity, { icon: typeof AlertOctagon; label: string }> = {
  HIGH: { icon: AlertOctagon, label: "High" },
  MEDIUM: { icon: AlertTriangle, label: "Medium" },
  LOW: { icon: Info, label: "Low" },
};

export default function SeverityPill({ severity }: { severity: HeuristicSeverity }) {
  const { icon: Icon, label } = SEVERITY_CONFIG[severity];
  return (
    <span className={`severity-pill severity-pill--${severity.toLowerCase()}`}>
      <Icon size={11} aria-hidden="true" />
      {label}
    </span>
  );
}
