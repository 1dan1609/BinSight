# BinSight

Open-source portfolio project: a web app for reverse engineers that statically analyzes Windows PE
(malware) files, then uses AI to generate a one-shot report of flags + suggested dynamic-analysis
next steps. Displayed in the UI and downloadable. Priorities, in order: **usefulness > security >
CI/CD/Docker demo value.**

Product context (users, positioning, principles) lives in `frontend/PRODUCT.md` — read it before
UI/copy work. This file covers architecture/engineering decisions.

## Architecture (do not re-litigate — these were deliberately chosen after weighing alternatives)

- **Hybrid client/server.** All PE parsing happens client-side in the browser (TypeScript, in a Web
  Worker). The raw file **never leaves the browser** — no file-upload attack surface server-side, and
  matches RE practitioners' reluctance to upload live samples to a third party. Only extracted
  structured indicators (JSON) are sent to the backend.
- **AI report is one-shot, not a chat.** Single request → single markdown report. No conversation
  state, nothing persisted server-side.
- **Dual AI provider modes**, user-selectable: a free-tier **hosted key (Groq, open-weight model)**
  as the zero-friction default, and **BYOK** for unlimited use on the user's own key. The hosted path
  is the most likely abuse target (people trying to use it as a free open LLM proxy) and needs the
  strongest protection: per-IP rate limit + SQLite-backed daily global quota + payload-shape
  validation before any LLM call.
- **File scope v1: Windows PE only.** `IndicatorsJSON` carries a `format: "pe"` discriminant so
  ELF/Office support later is additive, not a redesign.
- **Hosting: Oracle Cloud "Always Free" ARM VM, self-managed** (Docker Compose + Caddy), not a PaaS —
  deliberate choice to demonstrate real infra ownership (reverse proxy, TLS, firewall, SSH hardening)
  for the resume goal, after the GCP free trial was exhausted. Free DuckDNS subdomain + Let's Encrypt
  via Caddy for TLS.
- **CI/CD security gates are load-bearing, not decorative**: gitleaks (secrets), CodeQL (SAST), Trivy
  (image/dependency CVEs, blocking on critical), Dependabot, and a fuzz-test suite specifically for
  the PE parser against malformed/adversarial input — chosen because they double as demonstrations of
  the security priority, not just pipeline mechanics.

## Tech stack

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS, `react-markdown` + `remark-gfm`
  (deliberately **no** `rehype-raw` — security control against the AI report containing raw HTML).
- **Backend**: Node 20 LTS + TypeScript + Fastify (`@fastify/rate-limit`, `@fastify/helmet`,
  `@fastify/cors`), `zod` for schema validation, `pino` with redact paths for secrets,
  `better-sqlite3` for the daily hosted-quota counter, `groq-sdk` + a small OpenAI-compatible client
  for BYOK.
- **Monorepo**: pnpm workspaces (run via `npx pnpm` in this environment — global pnpm install hit a
  Windows permissions issue; do not fight this, just prefix commands). Shared `packages/shared-types`
  holds the Zod schema for `IndicatorsJSON` so frontend and backend can never drift.

## Repository structure

```
frontend/src/parser/       # safeReader, peHeaderParser, sectionAnalyzer, importExportWalker,
                            # stringExtractor, entropyCalculator, hashCalculator, heuristics,
                            # indicatorsBuilder, peParser.worker.ts
frontend/src/components/   # FileDropzone, IndicatorsSummaryView, ProviderSelector, ReportView,
                            # DownloadButtons
frontend/tests/{unit,fuzz}/
frontend/fixtures/         # self-compiled BENIGN tiny PE samples only — never real malware
backend/src/routes/report.ts
backend/src/services/{promptBuilder,reportSanitizer}.ts
backend/src/providers/{ProviderClient,GroqHostedProvider,OpenAICompatibleProvider,providerRegistry}.ts
backend/src/lib/{dailyQuota,logger}.ts
backend/src/config/env.ts
backend/src/plugins/security.ts
packages/shared-types/src/indicators.ts
infra/{docker-compose.yml,Caddyfile,.env.example,RUNBOOK.md}
.github/workflows/{ci.yml,codeql.yml,security-scan.yml,fuzz.yml,cd.yml}
docs/{ARCHITECTURE.md,SECURITY.md,THREAT_MODEL.md}
```

## Key security controls (see full plan for the complete table)

| Surface | Controls |
|---|---|
| PE parsing (client) | Web Worker isolation, bounds-checked reads via `SafeReader`, hard caps on all counts regardless of header claims, wall-clock timeout owned by the *main thread* (`Promise.race` + `worker.terminate()`), no dynamic code execution, fuzz-tested in CI |
| Indicators JSON (backend) | Re-validated server-side with the same strict Zod schema (`.strict()`) — never trust the client, since anyone can POST directly bypassing the browser parser |
| AI prompt | Untrusted indicator data delimited/tagged with explicit data-vs-instruction framing, truncated to bound size; model has no tools/function-calling |
| Hosted AI key | Per-IP rate limit + SQLite daily global quota (hard-caps worst-case spend to $0) + payload-shape validation |
| BYOK key | In-memory only for the single call, never logged (pino redact) or persisted, TLS-only, hardcoded provider base-URL allow-list (no SSRF — user selects an enum, never supplies a URL) |
| Public VM | SSH key-only + non-root deploy user + fail2ban, ufw restricted to 22/80/443 matched at Oracle's NSG layer, Caddy auto-TLS, unattended-upgrades |
| CI pipeline | gitleaks + CodeQL + Trivy (blocking on critical) + Dependabot required before merge to `main` |

## Roadmap

- **Phase 0 — Scaffolding**: workspaces, shared TS/ESLint config, empty Fastify + Vite apps, CI
  skeleton (lint+build), LICENSE/README.
- **Phase 1 — v1 MVP**: full PE parsing → `IndicatorsJSON`; dropzone + indicators summary view
  (useful even before AI); Groq hosted-mode report endpoint; markdown render + download; manual first
  deploy to the Oracle VM with Caddy+DuckDNS TLS working end-to-end; CI lint/test/build gates.
- **Phase 2 — Hardening + full CI/CD**: BYOK mode, suspicious-API heuristics, SQLite daily quota,
  parser fuzz suite wired into CI, full blocking scan suite, CD pipeline (GHCR + SSH deploy), AI
  output sanitization pass.
- **Phase 3 — Stretch (optional)**: client-side Markdown→PDF, Playwright E2E, Rust/WASM entropy
  calculator, YARA-via-WASM, ELF/Office-macro parsers, `/healthz` + observability, Turnstile if
  hosted-mode abuse is observed.

## Fixtures policy

`frontend/fixtures/` must only ever contain **self-compiled, benign** PE files (e.g. a trivial
"hello world" C program compiled to a tiny .exe) used to validate the parser structurally. **Never**
commit real malware samples to this repo — it must stay safe to clone, scan, and fork.

## Licensing

MIT. Verify every new dependency stays MIT/Apache/BSD-compatible (especially any future Rust crate or
YARA-WASM binding) — avoid GPL/AGPL.

Full original plan with rationale: see conversation history / `docs/ARCHITECTURE.md` once written.
