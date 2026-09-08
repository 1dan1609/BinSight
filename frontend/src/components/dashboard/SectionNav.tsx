import type { IndicatorsJson } from "@pe-analyzer/shared-types";
import { SECTIONS, type SectionId } from "./sections";

interface SectionNavProps {
  indicators: IndicatorsJson;
  active: SectionId;
  onSelect: (id: SectionId) => void;
}

export default function SectionNav({ indicators, active, onSelect }: SectionNavProps) {
  const dataSections = SECTIONS.filter((s) => !s.isAi);
  const aiSection = SECTIONS.find((s) => s.isAi)!;

  return (
    <nav className="nav-rail" aria-label="Analysis sections">
      <div className="nav-rail__group-label">Static Analysis</div>
      {dataSections.map((section) => {
        const Icon = section.icon;
        const badge = section.badgeCount?.(indicators);
        const tone = section.badgeTone?.(indicators) ?? "neutral";
        return (
          <button
            key={section.id}
            type="button"
            className="nav-item"
            aria-current={active === section.id}
            onClick={() => onSelect(section.id)}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{section.label}</span>
            {badge !== undefined && (
              <span className={`nav-item__badge nav-item__badge--${tone}`}>{badge}</span>
            )}
          </button>
        );
      })}

      <div className="nav-rail__group-label">AI</div>
      <button
        type="button"
        className="nav-item nav-item--ai"
        aria-current={active === aiSection.id}
        onClick={() => onSelect(aiSection.id)}
      >
        <aiSection.icon size={16} aria-hidden="true" />
        <span>{aiSection.label}</span>
      </button>
    </nav>
  );
}
