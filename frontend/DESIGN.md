---
name: BinSight
description: A PEStudio-caliber static-analysis workbench for Windows PE files — dark analyst-tool register, one violet accent reserved strictly for the AI report.
colors:
  interactive-blue: "#5b9dff"
  link-blue: "#6ea8ff"
  sev-high: "#f2555a"
  sev-high-bg: "#2a1417"
  sev-medium: "#e8a33d"
  sev-medium-bg: "#2a2116"
  sev-low: "#6b7280"
  ai-accent: "#a684ff"
  ai-accent-bg: "#1a1530"
  ai-accent-border: "#3d3266"
  bg-shell: "#0a0b0e"
  bg-panel: "#111318"
  bg-elevated: "#191c23"
  bg-inset: "#0d0e12"
  bg-hover: "#1c2029"
  border-subtle: "#21252e"
  border-default: "#2b303b"
  border-strong: "#3a4150"
  text-primary: "#e8eaed"
  text-secondary: "#a3aab8"
  text-tertiary: "#6b7280"
  text-caption: "#838a99"
  text-on-accent: "#0a0b0e"
typography:
  title:
    fontFamily: "-apple-system, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    letterSpacing: "normal"
  body:
    fontFamily: "-apple-system, 'Segoe UI', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.04em"
  mono:
    fontFamily: "ui-monospace, 'Cascadia Code', 'JetBrains Mono', Consolas, monospace"
    fontSize: "0.85em"
    fontFeature: "tabular-nums"
rounded:
  sm: "4px"
  md: "6px"
components:
  button-primary:
    backgroundColor: "{colors.ai-accent}"
    textColor: "{colors.text-on-accent}"
    rounded: "{rounded.sm}"
    padding: "0.55rem 1.1rem"
  button-secondary:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.9rem"
  severity-pill-high:
    backgroundColor: "{colors.sev-high-bg}"
    textColor: "{colors.sev-high}"
    rounded: "{rounded.sm}"
    padding: "0.12rem 0.45rem"
  tag-flag:
    backgroundColor: "{colors.sev-medium-bg}"
    textColor: "{colors.sev-medium}"
    rounded: "{rounded.sm}"
    padding: "0.1rem 0.4rem"
  nav-item-active:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
  nav-item-ai-active:
    backgroundColor: "{colors.ai-accent-bg}"
    textColor: "{colors.ai-accent}"
    rounded: "{rounded.sm}"
  dropzone:
    backgroundColor: "{colors.bg-panel}"
    rounded: "{rounded.md}"
    padding: "3rem 2rem"
---

# Design System: BinSight

## Overview

**Creative North Star: "The Disassembler's Bench"**

BinSight reads as a debugger console, not a marketing surface: near-black panel tiers, a fixed left-hand section rail, and dense property tables that assume the reader is a reverse engineer who already knows what RVA, entropy, and TLS callbacks mean. The register is IDA/Ghidra/x64dbg lineage — restrained neutral grays, every address and hash in monospace with tabular numerals, and color spent as signal rather than decoration. Nothing about the surface performs enthusiasm; it just lays out the data and gets out of the way.

Two disciplines hold the world together. First, state is never color-only — every severity indicator pairs an icon and a text label with its color (`SeverityPill`, nav badges), so the system reads correctly for a colorblind analyst and at a glance for everyone else. Second, color is spent sparingly: severity red/amber/gray is reserved for real flags and never leaks into chrome, and the single violet accent is confined to the AI Report section by rule, not by accident — verified in the shipped CSS, `--ai-accent` and its `-bg`/`-border` pairs appear in exactly one component file (`AiReportPanel.tsx`) and the AI nav item's own selectors.

There are no shadows anywhere in this system. Depth is conveyed entirely by a five-step background ladder (`--bg-shell` → `--bg-panel` → `--bg-elevated` → `--bg-hover`, plus a recessed `--bg-inset` for form controls) and 1px borders — a flat, tonal-layering world, consistent with the analyst-tool references it draws from.

**Key Characteristics:**
- Dark, near-black panel tiers with no drop shadows — depth is tonal, not lifted.
- Every address, hash, offset, and byte count is monospace with tabular numerals.
- Severity color (red/amber/gray) is reserved exclusively for real heuristic flags; it never decorates chrome.
- One violet accent (`--ai-accent`) exists, and it appears nowhere outside the AI Report nav item and panel.
- State is always icon + label + color together — never color alone.

## Colors

A near-black neutral base carries almost the whole interface; the only saturated colors are functional — severity for flags, one violet confined to a single panel.

### Primary
- **Interactive Blue** (`#5b9dff`): the app's only broadly-used accent — `:focus-visible` outlines, text selection, and the dropzone's hover/active border and background shift. It is the one color that appears on any interactive element, anywhere in the app.
- **Link Blue** (`#6ea8ff`): a lighter sibling reserved for `<a>` text, distinct from the focus/selection blue so links stay legible against both backgrounds without competing with focus rings.

### Secondary
- **Severity High** (`#f2555a` on `#2a1417`): the alarm color — high-severity heuristic flags only (severity pills, flagged badges, error banners). Never used decoratively.
- **Severity Medium** (`#e8a33d` on `#2a2116`): medium-severity flags, flagged table rows (`tr.row--flagged`), warning banners, and the flag-tag style used on suspicious strings/imports.
- **Severity Low** (`#6b7280`): deliberately shares its hex with `--text-tertiary`, and its background (`#191c23`) shares its hex with `--bg-elevated`. Low-severity findings are dressed in the same neutral gray as the rest of the chrome, on purpose — low severity should not visually compete with real alarms.

### Tertiary
- **AI Violet** (`#a684ff` on `#1a1530`, border `#3d3266`): the one color in the system that exists purely to look foreign. It is the primary-button fill and the AI nav item/panel's identity, and it appears nowhere else — confirmed by search, only `index.css` and `AiReportPanel.tsx` reference it. Its rarity is what makes the AI Report read as a distinct, bolted-on feature rather than the app's center of gravity.

### Neutral
- **Shell Black** (`#0a0b0e`): the outermost background — `body`, the empty-state dropzone screen.
- **Panel Black** (`#111318`): the first elevation step — header bar, nav rail, table/finding card backgrounds.
- **Elevated Charcoal** (`#191c23`): second elevation step — hovered/active nav items, secondary buttons, tags, `--sev-low-bg`.
- **Inset Black** (`#0d0e12`): recessed surfaces — text inputs, selects, the strings search field.
- **Hover Charcoal** (`#1c2029`): row/nav hover states layered above panel or elevated backgrounds.
- **Border Subtle / Default / Strong** (`#21252e` / `#2b303b` / `#3a4150`): a three-step border ramp from barely-there dividers up to the dropzone's dashed outline and scrollbar thumb.
- **Text Primary / Secondary / Tertiary / Caption** (`#e8eaed` / `#a3aab8` / `#6b7280` / `#838a99`): a four-step text ramp — see the Named Rule below; primary is body copy and values, secondary is subtext, tertiary is decorative-icon-only, caption is for label/caption copy that must clear 4.5:1.
- **Text on Accent** (`#0a0b0e`): the near-black text set on top of the violet primary button.

### Named Rules
**The Caption-vs-Tertiary Rule.** `--text-tertiary` (`#6b7280`) only meets a 3:1 contrast floor and is reserved for decorative, icon-only elements (dropzone icon, chevrons, search icon). Any caption-weight text that is actually read — `kv dt` labels, `panel-section h3`, `data-table th`, `nav-rail__group-label` — uses `--text-caption` (`#838a99`, 5.36:1 on panel/shell) instead. This split exists because the finish-review pass caught caption text failing the 4.5:1 body-text floor on `--text-tertiary`; don't collapse the two tokens back into one.

**The Confined Accent Rule.** `--ai-accent` and its `-bg`/`-border` pairs are used only inside the AI Report nav item and the AI Report panel. No other button, link, or chrome element may take the violet — its scarcity is what keeps the dashboard, not the AI feature, reading as the product.

**The Real-Severity Rule.** A nav badge or table highlight only takes an alarm color (red/amber) when it is backed by an actual `HeuristicSeverity` value. A plain item count with no severity of its own — e.g. Sections' flagged-anomaly count — renders in the neutral badge tone (`.nav-item__badge--neutral`), never red, so that red keeps meaning "real severity" everywhere it appears.

## Typography

**UI Font:** `-apple-system, "Segoe UI", system-ui, sans-serif`
**Mono Font:** `ui-monospace, "Cascadia Code", "JetBrains Mono", Consolas, monospace`

**Character:** One system UI stack for every label and paragraph — no display face, no editorial pairing. The monospace stack is the second voice, and it is load-bearing: it appears on every address, hash, offset, and raw numeric field so the analyst can visually parse structured data at a glance.

### Hierarchy
- **Title** (700, 1.05rem): panel headers (`panel-header h2`) — one per section, the only place bold size carries a section's identity.
- **Body** (400, 14px base / 0.85rem in tables and property lists, 1.5 line-height): the default reading size for descriptions, findings, and table cells.
- **Label** (700, 0.68–0.75rem, 0.03–0.06em letter-spacing, uppercase): section group labels, table column headers, and `kv dt` field names — always on `--text-caption`, never `--text-tertiary`.
- **Mono** (0.85em, tabular numerals via `font-variant-numeric: tabular-nums`): every hex address, hash, byte offset, and numeric table column. Applied via the `.mono` utility class plus the blanket rule on `.data-table td` and `.kv dd`.

### Named Rules
**The Tabular-Nums Rule.** Any numeric or hex value that appears in a data table or key/value list gets `font-variant-numeric: tabular-nums` so stacked numbers align vertically — non-negotiable for a table-dense analyst tool where columns of hex offsets and byte counts are scanned, not read.

## Layout

A fixed two-pane shell: a 220px left-hand section rail (`.nav-rail`) beside a flexible, independently-scrolling detail panel (`.detail-panel`, `flex: 1`, `overflow-y: auto`). Before a file is loaded, the entire body collapses to a single centered dropzone (`.empty-state`) — the nav rail doesn't render until indicators exist, matching the direction contract's first-viewport rule.

Spacing is not tokenized as CSS custom properties; it is authored directly in rem values, but a consistent rhythm recurs throughout: tight internal gaps (0.4–0.6rem) inside rows and badges, 0.75–1rem between related elements, 1.25–2rem between panel sections, and up to 3rem for the dropzone's own padding. Detail-panel content uses 1.5rem/2rem/3rem (top/sides/bottom) padding at desktop width.

At 860px and below, the layout collapses to a single column: the nav rail becomes a horizontal scrolling strip (group labels hidden), `kv` grids drop to a single column, and `data-table` gains horizontal scroll instead of wrapping.

## Elevation & Depth

There is no `box-shadow` anywhere in this system — depth is entirely tonal. A five-step background ladder (`--bg-shell` → `--bg-panel` → `--bg-elevated` → `--bg-hover`, with `--bg-inset` as a sixth, recessed step for form controls) plus a three-step border ramp (`--border-subtle` → `--border-default` → `--border-strong`) do all the work that shadows would do in a lifted-surface system. Hover and active states step one tier lighter; nothing ever floats above the page.

### Named Rules
**The Flat-By-Default Rule.** No component uses `box-shadow`, `filter: drop-shadow`, or `backdrop-filter`. Depth is read entirely from background-tier and border-tier steps — a shadow anywhere in this system would be a visual outlier, not a variation on an existing pattern.

## Shapes

Two radius steps cover the whole system: `--radius-sm` (4px) for nearly everything — banners, tags, pills, buttons, inputs, the scrollbar thumb — and `--radius-md` (6px) for panel-scale containers — the dropzone, finding cards, and the AI panel. One additional shape is not tokenized: the nav-item count badge uses a fully-rounded `border-radius: 999px` pill, a one-off distinct to that single component rather than a third scale step. The dropzone is the system's only dashed border (`1px dashed var(--border-strong)`); every other border is solid.

## Components

### Buttons
- **Shape:** 4px radius (`--radius-sm`) on all variants.
- **Primary:** `--ai-accent` fill, `--text-on-accent` text, `0.55rem 1.1rem` padding, 600 weight — used only for the "Generate report" action inside the AI panel. Its hover state is `filter: brightness(1.1)`, not a color swap; disabled drops to `opacity: 0.5`.
- **Secondary:** `--bg-elevated` fill, `--text-primary` text, `1px solid var(--border-default)` outline, `0.5rem 0.9rem` padding — the download buttons. Hover moves to `--bg-hover` fill with `--border-strong` outline.
- **Loading state:** the primary button swaps its label for a spinning `Loader2` icon (`.spin`, 0.9s linear) while a report generates; the spin is disabled under `prefers-reduced-motion: reduce`.

### Tags / Pills
- **Tag (default):** `--bg-elevated` background, `--text-secondary` text, `1px solid var(--border-default)` — section characteristics, neutral labels.
- **Tag (flagged):** `--sev-medium-bg` background, `--sev-medium` text — suspicious strings, section anomalies.
- **Severity Pill:** icon + label + color together (never color alone) — `AlertOctagon`/high, `AlertTriangle`/medium, `Info`/low, each on its severity's bg/fg pair.

### Cards / Containers
- **Corner Style:** 6px radius (`--radius-md`) for the dropzone, finding cards, and the AI panel; 4px (`--radius-sm`) for import-group disclosure containers.
- **Background:** `--bg-panel` for finding cards and import groups; `--ai-accent-bg` for the AI panel specifically.
- **Shadow Strategy:** none — see Elevation & Depth.
- **Border:** 1px solid, `--border-subtle` on finding/import cards, `--ai-accent-border` on the AI panel.
- **Internal Padding:** `0.65rem 0.8rem` for findings, `1.25rem 1.5rem` for the AI panel.

### Inputs / Fields
- **Style:** `--bg-inset` background, `1px solid var(--border-default)`, `--radius-sm` corners — text inputs, selects, the strings search field.
- **Focus:** the global `:focus-visible` treatment — `2px solid var(--focus-ring)` outline, `2px` offset. No glow or border-color shift beyond the outline.
- **Disabled:** form fields disable natively; the BYOK API-key field carries `autoComplete="off"` and a hint that the key is never stored or logged.

### Navigation
- **Style:** icon (16px) + label per item, left-aligned, full-width row buttons in a fixed 220px rail, grouped under uppercase caption-weight group labels ("Static Analysis" / "AI").
- **Default:** `--text-secondary` text, `--text-tertiary` icon.
- **Hover:** `--bg-hover` background, `--text-primary` text.
- **Active** (`aria-current="true"`): `--bg-elevated` background, `--text-primary` text and icon, 600 weight.
- **AI item:** always renders in `--ai-accent` (icon + text), even at rest; when active it takes `--ai-accent-bg` instead of the neutral active background — the only nav item with its own color identity.
- **Badges:** count badges take severity tone (`--sev-high`/`--sev-medium`) only when backed by real severity data; otherwise neutral gray. See The Real-Severity Rule.
- **Mobile treatment:** the rail becomes a horizontal scroll strip; group labels hide; items shrink to intrinsic width.

### Trust Indicator (signature component)
A persistent header-bar line (`ShieldCheck` icon + text) stating the file was parsed entirely client-side and never uploaded — copy changes tense once a file is loaded ("This file was parsed..." vs. "Files are parsed..."). This exists because the product's core trust claim (PRODUCT.md: "the raw file never leaves the browser") must be legible in the UI itself, not just documented — it is the one piece of UI chrome that exists to make an architectural property visible.

## Do's and Don'ts

### Do:
- **Do** pair every state indicator with an icon and a text label alongside its color — never rely on color alone (severity pills, nav badges).
- **Do** use the monospace stack with tabular numerals for every address, hash, offset, and byte count.
- **Do** keep `--ai-accent` confined to the AI Report nav item and panel; see The Confined Accent Rule.
- **Do** use `--text-caption` (not `--text-tertiary`) for any caption-weight text that is actually read continuously (table headers, field labels, hints) — reserve `--text-tertiary` for decorative icons only.
- **Do** convey depth with the background-tier and border-tier ladders, never with shadows.

### Don't:
- **Don't** apply severity red/amber to a nav badge or table highlight that isn't backed by a real `HeuristicSeverity` value — plain counts stay neutral gray.
- **Don't** introduce a second saturated accent color; the system's entire "foreignness" budget is spent on one violet, scoped to one feature.
- **Don't** add `box-shadow`, `drop-shadow`, or `backdrop-filter` anywhere — this system is flat by rule, not by omission.
- **Don't** reuse `--text-tertiary` for body, label, or hint copy that must clear a 4.5:1 contrast floor — it only clears 3:1 and is reserved for decorative icons.
