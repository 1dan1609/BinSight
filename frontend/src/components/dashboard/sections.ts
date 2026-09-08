import {
  AlertTriangle,
  Braces,
  Bug,
  FileCode2,
  Fingerprint,
  Layers,
  LayoutDashboard,
  Link2,
  Sparkles,
  Type,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { HeuristicSeverity, IndicatorsJson } from "@pe-analyzer/shared-types";

export type SectionId =
  | "overview"
  | "flags"
  | "header"
  | "sections"
  | "imports-exports"
  | "strings"
  | "overlay"
  | "tls"
  | "debug"
  | "rich-header"
  | "ai-report";

export type BadgeTone = "high" | "medium" | "low" | "neutral";

const SEVERITY_TONE: Record<HeuristicSeverity, BadgeTone> = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

function maxSeverityTone(findings: { severity: HeuristicSeverity }[]): BadgeTone {
  if (findings.some((f) => f.severity === "HIGH")) return "high";
  if (findings.some((f) => f.severity === "MEDIUM")) return "medium";
  if (findings.some((f) => f.severity === "LOW")) return "low";
  return "neutral";
}

export interface SectionDef {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  isAi?: boolean;
  badgeCount?: (indicators: IndicatorsJson) => number | undefined;
  /** Defaults to "neutral" when omitted — only counts backed by real severity data get alarm colors. */
  badgeTone?: (indicators: IndicatorsJson) => BadgeTone;
}

export const SECTIONS: SectionDef[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  {
    id: "flags",
    label: "Flags",
    icon: AlertTriangle,
    badgeCount: (i) => (i.heuristics.length > 0 ? i.heuristics.length : undefined),
    badgeTone: (i) => maxSeverityTone(i.heuristics),
  },
  { id: "header", label: "Header", icon: FileCode2 },
  {
    id: "sections",
    label: "Sections",
    icon: Layers,
    // Section anomalies (WRITABLE_AND_EXECUTABLE, HIGH_ENTROPY, ...) carry no severity rating of
    // their own — a neutral badge here, not alarm-red, keeps red meaning "real severity" everywhere.
    badgeCount: (i) => {
      const flagged = i.sections.filter((s) => s.anomalies.length > 0).length;
      return flagged > 0 ? flagged : undefined;
    },
  },
  { id: "imports-exports", label: "Imports / Exports", icon: Link2 },
  { id: "strings", label: "Strings", icon: Type },
  {
    id: "overlay",
    label: "Overlay",
    icon: Braces,
    badgeCount: (i) => (i.overlay.present ? 1 : undefined),
    badgeTone: (i) =>
      SEVERITY_TONE[i.heuristics.find((f) => f.id === "OVERLAY_DATA_PRESENT")?.severity ?? "LOW"] ??
      "neutral",
  },
  {
    id: "tls",
    label: "TLS Callbacks",
    icon: Zap,
    badgeCount: (i) => (i.tls.callbackCount > 0 ? i.tls.callbackCount : undefined),
    badgeTone: (i) =>
      SEVERITY_TONE[i.heuristics.find((f) => f.id === "TLS_CALLBACKS_PRESENT")?.severity ?? "MEDIUM"] ??
      "neutral",
  },
  { id: "debug", label: "Debug Info", icon: Bug },
  { id: "rich-header", label: "Rich Header", icon: Fingerprint },
  { id: "ai-report", label: "AI Report", icon: Sparkles, isAi: true },
];
