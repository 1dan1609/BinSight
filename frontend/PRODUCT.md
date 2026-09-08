# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 18 + TypeScript + Vite, Tailwind CSS. Chosen deliberately (not delegated) through direct discussion — TypeScript across the whole stack for consistency with the Fastify backend, Vite for its Web Worker and WASM support (the client-side parser runs inside a Web Worker).

## Users

Reverse engineers and malware analysts triaging a Windows PE (executable) file. They are technically expert — comfortable with PE header structure, import tables, entropy/packing concepts — and are visiting to get a fast first-pass read on a suspicious binary before deciding whether (and how) to invest in deeper manual or dynamic analysis. They are often wary of uploading live malware samples to third-party services.

## Product Purpose

BinSight statically analyzes a Windows PE file entirely in the browser (the file itself never leaves the user's machine), extracts structured indicators (headers, sections, entropy, imports/exports, strings, suspicious API heuristics), and generates a one-shot AI report summarizing the flags found and suggesting concrete next steps for further dynamic analysis. The report is displayed in the UI and downloadable. Success is a reverse engineer getting a genuinely useful, trustworthy first-pass triage in under a minute, with zero setup friction.

## Positioning

The defining mechanism a competing tool couldn't casually copy: the raw file never leaves the browser. Analysis runs client-side; only derived, structured indicators (never the binary) are sent anywhere, and only to generate the AI report. This is both a security property (no server-side file-parsing attack surface) and a trust property for an audience that is often unwilling to upload live samples to a third party. Most competing "upload your malware for analysis" tools require exactly the trust this tool is designed not to need.

## Operating Context

- A single-page, single-purpose flow: drop/select a PE file → client parses it and shows an indicators summary immediately (useful on its own, before any AI call) → user optionally requests an AI-generated report → report renders as markdown in the UI and is downloadable.
- Two AI modes, user-selectable: a free hosted key (zero-friction default, rate-limited) or bring-your-own API key (unlimited, entered per-session, never stored/logged).
- The AI report is one-shot — a single generated document, not a chat/conversational interface. No history, nothing persisted server-side.
- v1 scope is Windows PE files only.
- Open source; the repo itself (including any bundled test fixtures) must stay safe to clone — no real malware samples are ever committed.

## Capabilities and Constraints

- Client-side parser extracts: DOS/NT headers, section table with per-section entropy, import/export tables with suspicious-API heuristics, extracted/classified strings (URLs, IPs, registry keys, keywords), file hashes (MD5/SHA1/SHA256), and an overall packing/entropy read.
- Parser must fail safely on adversarial/malformed input (truncated, corrupted, or hostile PE files are expected, not edge cases) — no crashes, hangs, or unbounded resource use.
- Backend is a thin, stateless proxy: validates indicators, builds the AI prompt (with untrusted extracted data clearly delimited against prompt injection), calls the selected provider, returns markdown. It never receives the raw file.
- Free to host indefinitely (self-managed VM on a permanent free tier); this rules out expensive server-side compute for parsing or hosting a self-run model.
- Undecided: exact visual identity/branding beyond the name; whether future versions add ELF/Office-macro format support (architecture leaves room for it, not committed to).

## Brand Commitments

Name: **BinSight**. No other visual or voice commitments exist yet — logo, palette, typography, and tone are open.

## Evidence on Hand

None yet. No existing screenshots, testimonials, sample reports, or reference deployments to draw on — this is a from-scratch build. Do not fabricate sample AI reports, benchmark numbers, or testimonials; any example content shown in the UI (e.g. an empty-state preview) must be clearly synthetic/illustrative, not presented as a real analysis.

## Product Principles

1. Trust through architecture, not just claims — the "file never leaves your browser" property should be visible and legible in the UI itself, not just documented in a README.
2. Useful before AI — the indicators summary must stand on its own as valuable output even if a user never requests the AI report.
3. Speaks the user's language — an expert audience; avoid dumbing down terminology (entropy, RVA, ordinal imports, etc.), but make flagged findings scannable at a glance for a fast triage pass.
4. Fails loud to the analyst, fails safe to the system — malformed/hostile input must never crash or hang the tool, but when the parser can't fully make sense of a file, say so explicitly rather than silently showing incomplete results as if complete.

## Accessibility & Inclusion

No product-specific requirement established yet; standard web accessibility practice applies by default.
