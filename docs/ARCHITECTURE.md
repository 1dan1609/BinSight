# Architecture — Original Plan

> **This is the original architecture plan**, written and approved during the project's initial
> planning session, before any code existed. It's preserved here verbatim as the historical record
> of *why* the major decisions were made — the trade-offs weighed, the alternatives rejected, and
> the reasoning behind them.
>
> **It is not the current status.** The project evolved past several specifics here as it was
> built — most notably: `groq-sdk` was dropped in favor of one hand-rolled OpenAI-compatible HTTP
> client serving both hosted and BYOK modes; Tailwind CSS was dropped in favor of hand-authored CSS
> design tokens during the dashboard redesign; the client-side parser grew well beyond this plan's
> scope (overlay detection, TLS callbacks, PE Debug Directory/PDB path, the MSVC Rich header); and
> the UI was redesigned from a single-column MVP layout into a section-nav-driven dashboard. For
> **current, accurate status** — what's built, what's in progress, and what's next — read
> [`CLAUDE.md`](../CLAUDE.md) at the repo root instead. This document is architecture rationale,
> not a live checklist.

## Context

This is a greenfield portfolio project for an early-career SWE. The goal is a web app for reverse engineers that statically analyzes Windows PE (malware) files client-side, then generates a one-shot AI report summarizing flags and suggesting dynamic-analysis next steps — displayed in the UI and downloadable. It must be genuinely useful (not a checkbox demo), designed for adversarial probing from day one, free to host indefinitely, and open source. A secondary but explicit goal is that the CI/CD pipeline and self-managed infra be strong, concrete resume artifacts.

Priorities, in order: **usefulness > security > CI/CD/Docker demo value.**

Key decisions locked in through discussion with the user:
- **Hybrid architecture**: all PE parsing happens client-side (file never leaves the browser — eliminates the file-upload attack surface and matches RE practitioners' reluctance to upload live samples to a third party). Only extracted structured indicators (JSON) go to a thin backend.
- **AI report is one-shot, not a chat**: single request → single markdown report, displayed + downloadable. No conversation state.
- **AI provider**: dual mode, user-selectable — a free-tier hosted key (Groq, open-weight model) as the zero-friction default, plus BYOK for unlimited use on the user's own dime. The hosted path is the most likely abuse target and needs the strongest protection.
- **File scope v1**: Windows PE only. Architecture leaves room to add ELF/Office formats later without a redesign.
- **Hosting**: Oracle Cloud "Always Free" ARM VM, self-managed (not a PaaS) — deliberately chosen over Cloud Run (GCP trial exhausted) and Render, because the user wants to demonstrate real infra ownership (reverse proxy, TLS, firewall, process management), not just a button-push deploy, to make this read as an "enterprise-grade real tool" rather than a checkbox project.
- **Domain/TLS**: free DuckDNS subdomain + Let's Encrypt via Caddy.
- **CI/CD security scope**: dependency/vulnerability scanning (Trivy + Dependabot), SAST (CodeQL), secret scanning (gitleaks), and fuzz-testing the PE parser against malformed/adversarial input — chosen specifically because they double as demonstrations of the security priority, not just pipeline mechanics.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS (+ optionally shadcn/ui), `react-markdown` + `remark-gfm` for report rendering (deliberately no `rehype-raw` — security control). PE parsing runs in pure TypeScript in a **Web Worker** for v1 (not WASM — keeps timeline realistic and fuzz-testable in CI without a Rust toolchain).
- **Backend**: Node 20 LTS + TypeScript + **Fastify** (`@fastify/rate-limit`, `@fastify/helmet`, `@fastify/cors`, `@fastify/sensible`), `zod` for schema validation, `pino` for logging with secret redaction, `better-sqlite3` for the daily hosted-quota counter (avoids standing up Redis/Postgres for a single-VM deployment), `groq-sdk` for the hosted provider plus a small OpenAI-compatible client for BYOK.
- **Monorepo**: `pnpm` workspaces. A shared `packages/shared-types` package holds the Zod schema for `IndicatorsJSON` so frontend (producer) and backend (validator) can never drift.

## Repository Structure

```
/
├── frontend/src/parser/       # peHeaderParser, sectionAnalyzer, importExportWalker,
│                               # stringExtractor, entropyCalculator, hashCalculator,
│                               # heuristics, indicatorsBuilder, safeReader, peParser.worker.ts
├── frontend/src/components/   # FileDropzone, IndicatorsSummaryView, ProviderSelector,
│                               # ReportView, DownloadButtons
├── frontend/tests/{unit,fuzz}/
├── frontend/fixtures/         # self-compiled BENIGN tiny PE samples only — never real malware
├── backend/src/routes/report.ts
├── backend/src/services/{promptBuilder,reportSanitizer}.ts
├── backend/src/providers/{ProviderClient,GroqHostedProvider,OpenAICompatibleProvider,providerRegistry}.ts
├── backend/src/lib/{dailyQuota,logger}.ts
├── backend/src/config/env.ts
├── backend/src/plugins/security.ts
├── packages/shared-types/src/indicators.ts
├── infra/{docker-compose.yml,Caddyfile,.env.example,RUNBOOK.md}
├── .github/workflows/{ci.yml,codeql.yml,security-scan.yml,fuzz.yml,cd.yml}
├── .github/dependabot.yml
├── docs/{ARCHITECTURE.md,SECURITY.md,THREAT_MODEL.md}
└── LICENSE (MIT), README.md
```

## Client-Side PE Parser

Every module is a pure function over `ArrayBuffer`/`Uint8Array`, independently unit-tested, and never throws an uncaught exception (returns typed `{ data, errors }`):

- **`safeReader.ts`** — bounds-checked `DataView` wrapper; every other module reads exclusively through it, so a malformed offset produces a typed `PEParseError`, not a crash.
- **`peHeaderParser.ts`** — DOS/NT headers, PE32/PE32+ optional header, entry point, subsystem, DLL characteristics — all offsets clamped to buffer bounds regardless of what the header claims.
- **`sectionAnalyzer.ts`** — section table (capped at a max count, e.g. 96, ignoring header claims beyond that), per-section entropy, flags: writable+executable sections, virtual size ≫ raw size, entropy > ~7.0 (packing).
- **`importExportWalker.ts`** — resolves import/export RVAs via the section table, flags suspicious API combinations (`VirtualAlloc`+`WriteProcessMemory`+`CreateRemoteThread`, `IsDebuggerPresent`, dynamic `LoadLibrary`+`GetProcAddress`, `WinHttp*`/`InternetOpen*`, `RegSetValue*`) via a data-driven table in `heuristics.ts`.
- **`stringExtractor.ts`** — ASCII/UTF-16LE printable runs, classified (URLs/IPs/emails/paths/registry keys/keywords), deduplicated, capped (e.g. top 2000 by relevance) to bound output size.
- **`entropyCalculator.ts`** / **`hashCalculator.ts`** — Shannon entropy; MD5 (via a small vetted lib, since `SubtleCrypto` has no MD5)/SHA1/SHA256 via Web Crypto.
- **`indicatorsBuilder.ts`** — orchestrates the pipeline, assembles `IndicatorsJSON` with a `format: "pe"` discriminant (so ELF/Office support later is additive), enforces an overall serialized-size cap with a `truncated: true` flag.
- **`peParser.worker.ts`** — runs in a Web Worker; the **main thread** owns a wall-clock timeout (e.g. 15s) via `Promise.race` + `worker.terminate()`, since a worker can't reliably self-interrupt a true infinite loop.

## Backend

**`POST /api/v1/report`** — the only endpoint, fully stateless (no report ever persisted server-side):
```
Request:  { indicators: IndicatorsJSON, provider: "hosted" | "byok",
            byokConfig?: { provider: "groq"|"openai"|..., apiKey: string, model?: string } }
Response: { markdown, generatedAt, modelUsed, warnings? }
```
- `promptBuilder.ts` wraps all untrusted indicator data in a clearly tagged block with explicit data-vs-instruction framing, truncated to bound prompt size and injection surface.
- `providerRegistry.ts` hardcodes provider name → base URL; **the base URL is never accepted from the client** (SSRF control) — BYOK selects an enum, never supplies a URL.
- `dailyQuota.ts` (SQLite) hard-caps hosted-mode worst-case spend to $0; `@fastify/rate-limit` handles per-IP limits.
- `reportSanitizer.ts` enforces max length and strips raw HTML as defense-in-depth (frontend also never renders raw HTML).
- `pino` redact paths ensure a BYOK key structurally cannot reach logs, even by accident.

## Security Controls by Surface

| Surface | Controls |
|---|---|
| PE parsing (client) | Web Worker isolation, bounds-checked reads, hard caps on all counts, wall-clock timeout + termination, no dynamic code execution, fuzz-tested in CI |
| Indicators JSON (backend) | Re-validated server-side with the same strict Zod schema (rejects unknown fields) — server never trusts the client, since anyone can POST directly bypassing the browser parser |
| AI prompt | Untrusted data delimited/tagged, truncated, model has no tools/function-calling (worst case of injection is a misleading report, not code exec) |
| Hosted AI key | Per-IP rate limit + SQLite daily global quota + payload-shape validation before any LLM call |
| BYOK key | In-memory only, never logged/persisted, TLS-only, hardcoded provider allow-list (no SSRF) |
| Public VM | SSH key-only + non-root deploy user + fail2ban, ufw restricted to 22/80/443 matched at Oracle's NSG layer, Caddy auto-TLS via Let's Encrypt, unattended-upgrades |
| CI pipeline | gitleaks + CodeQL + Trivy (blocking on critical) + Dependabot, all required before merge to `main` |

## Testing Strategy

- **Unit (Vitest)**: parser correctness against a self-compiled benign PE fixture (never real malware, to keep the repo safe to clone/scan); entropy/hash functions against known reference values.
- **Fuzz (`fast-check`, `frontend/tests/fuzz/`)**: truncation, random byte flips, extreme header values, out-of-bounds offsets, non-PE input. Asserts no unhandled exception, bounded time, output within documented caps. Runs on every PR touching `parser/` plus nightly — directly demonstrates the security priority.
- **Backend (Vitest + Fastify `.inject()`)**: schema rejection, rate-limit/quota behavior, prompt delimiting, provider clients mocked (`msw`/`nock`) — never hits real provider APIs in CI.
- **E2E (Playwright)**: stretch goal (Phase 3), one golden path with the LLM call network-mocked.

## Phased Roadmap

**Phase 0 — Scaffolding**: pnpm workspaces, shared TS/ESLint config, empty Fastify + Vite apps, CI skeleton (lint+build), LICENSE/README.

**Phase 1 — v1 MVP**: header/section/entropy/hash/string/import parsing → `IndicatorsJSON`; dropzone + indicators summary view (useful even before AI); Groq hosted-mode report endpoint with validation + basic rate limiting; markdown render + download; manual first deploy to the Oracle VM with Caddy+DuckDNS TLS working end-to-end; CI lint/test/build gates.

**Phase 2 — Hardening + full CI/CD**: BYOK mode, suspicious-API heuristics, SQLite daily quota, parser fuzz suite wired into CI, full blocking scan suite (Trivy/CodeQL/gitleaks/Dependabot), CD pipeline (build+push to GHCR, SSH deploy to the VM), AI output sanitization pass.

**Phase 3 — Stretch (explicitly optional)**: client-side Markdown→PDF; Playwright E2E; Rust/WASM entropy calculator with a JS-vs-WASM perf writeup; YARA-via-WASM client-side matching; ELF/Office-macro parsers; `/healthz` + basic observability; CAPTCHA/Turnstile on hosted mode if abuse is observed.

## Deployment Runbook

1. Provision Oracle Cloud Always Free ARM VM (Ampere A1, Ubuntu LTS).
2. Harden: non-root sudo deploy user, disable root SSH + password auth, ufw (22/80/443 only), fail2ban, unattended-upgrades.
3. Install Docker Engine + Compose plugin.
4. DuckDNS subdomain → VM public IP.
5. VM pulls prebuilt images from GHCR (doesn't build from source) — mirrors a real CD workflow, minimal VM footprint.
6. Secrets live only in a VM-local `.env` (`chmod 600`, never committed; `infra/.env.example` is the checked-in template), injected via Compose `env_file` at container-run-time — images themselves are secret-free.
7. Caddyfile: domain + email for Let's Encrypt, `reverse_proxy /api/* backend:PORT`, static frontend via `file_server`; named volumes persist certs.
8. `docker-compose.yml`: `backend` (GHCR image, `env_file`, no exposed host ports — reachable only via Caddy's internal network) + `caddy` (80/443 exposed).
9. CD: GitHub Actions builds/pushes images to GHCR (tagged by SHA + `latest`), then an SSH step (deploy-only key in Actions secrets) runs `docker compose pull && docker compose up -d` remotely. Actions never needs the Groq key.

## Licensing

MIT (default recommendation — lowest friction for an OSS portfolio piece). Verify every dependency (especially any future Rust crate or YARA-WASM binding) stays MIT/Apache/BSD-compatible; avoid GPL/AGPL. Automate with `license-checker` in CI once dependencies exist.

## Verification

- **Phase 1 MVP**: drop a self-compiled benign PE file onto the running frontend (`pnpm dev`), confirm indicators summary renders correctly; trigger a hosted-mode report generation and confirm markdown renders + downloads; run `pnpm test` for parser unit tests.
- **Security**: run the fuzz suite (`pnpm test:fuzz`) locally against malformed PE buffers and confirm no crashes/hangs; POST a malformed/oversized indicators payload directly to `/api/v1/report` (bypassing the frontend) and confirm it's rejected by schema validation, not forwarded to the AI provider.
- **CI/CD**: open a PR and confirm all gates run (lint, test, fuzz, CodeQL, gitleaks, Trivy) and block merge on a deliberately introduced vulnerability/secret to prove the gates are real, not decorative.
- **Deploy**: after CD runs, hit `https://<subdomain>.duckdns.org` and confirm a trusted Let's Encrypt cert, the frontend loads, and a real end-to-end report generation succeeds against the live VM.
