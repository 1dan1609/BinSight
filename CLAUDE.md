# BinSight

Open-source portfolio project: a PEStudio-caliber static-analysis dashboard for Windows PE
(malware) files, running entirely client-side, with a one-shot AI report layered on top as a
clearly-marked bonus feature. Priorities, in order: **usefulness > security > CI/CD/Docker demo
value.**

Product context (users, positioning, principles) lives in `frontend/PRODUCT.md` — read it before
UI/copy work. `frontend/DESIGN.md` records the shipped visual system (tokens, named rules,
component specs) — read it before touching any UI file, and update it if you change the design
system, not just the plan file. This file covers architecture/engineering decisions and session
handoff state.

## ⏸️ SESSION HANDOFF — read this first

The user paused here at the end of a long session and is picking this back up later, possibly in
a fresh Claude Code instance. **Do these two things before anything else:**

1. **Ask this exact question again, verbatim in spirit**, before touching Dockerfiles or CI further:
   > No Docker runtime is available locally (checked both native Windows and WSL2/Ubuntu). Two new
   > Dockerfiles exist (`backend/Dockerfile`, `frontend/Dockerfile`) that have **never been run** —
   > carefully reasoned through, not verified. Do you want me to install Docker inside WSL2 so I can
   > actually run `docker build` and catch real errors now, or proceed without local Docker testing
   > (first real test becomes the first GitHub Actions run, which needs this pushed to a GitHub repo)?

   Use `AskUserQuestion` with those two options (install Docker in WSL / skip local testing) — do
   not just pick one silently, and do not re-litigate this if the user already answered it earlier
   in the same session (only ask fresh if resuming cold, e.g. session start or after "continue").

2. **Read `git log --oneline -15`** to see exactly what's landed. The two most recent commits are
   the ones this handoff describes:
   - `Add SQLite daily quota for hosted AI mode; WIP Dockerfiles (UNTESTED)` — the quota feature is
     done and tested (13/13 backend tests pass); the Dockerfiles are the untested part above.
   - `Redesign frontend into a PEStudio-style analyst-workbench dashboard` — the full UI redesign,
     shipped and verified via Impeccable's finish-review cycle (disposition: ship).

### What's actually left in Phase 2 (CI/CD security gates — what the user asked for last)

Not started yet:
- `.github/workflows/security-scan.yml` — Trivy (scan both Docker images once they build cleanly,
  block on CRITICAL) + gitleaks (secret scanning on every PR).
- `.github/workflows/codeql.yml` — CodeQL SAST, scheduled + on PR.
- `.github/workflows/fuzz.yml` — wire `frontend/tests/fuzz/peParserFuzz.test.ts` (already exists,
  passes locally, just not in CI yet) into a PR-triggered-on-parser-changes + nightly-scheduled job.
- `.github/dependabot.yml` — npm + Dockerfile + GitHub Actions version updates.
- Branch protection requiring all of the above before merge to `main` (this one needs the user to
  actually push to GitHub and configure it in repo settings — you can't do this from the CLI).

Explicitly **out of scope** for this pass (don't drift into it unasked): the full CD pipeline
(GHCR push + SSH deploy to the Oracle VM) and `infra/docker-compose.yml`/`infra/Caddyfile` — those
are tied to the Oracle VM step, which needs the user's cloud account access and hasn't happened yet.

### Before writing more CI workflow files

Verify the Dockerfiles actually build (per however the handoff question above gets answered) —
writing `security-scan.yml` to run Trivy against images that don't build is wasted work. If the
user picks "skip local testing," write the workflow anyway (it's the only way to ever test it) but
say plainly that it's unverified until the first real CI run, don't imply it's confirmed working.

No GitHub remote exists yet for this repo (`git remote -v` is empty) — pushing/creating the repo
on GitHub is also unstarted and needs the user's decision (repo name, public/private, their
account), not something to do unprompted.

## Architecture (do not re-litigate — these were deliberately chosen after weighing alternatives)

- **Hybrid client/server.** All PE parsing happens client-side in the browser (TypeScript, in a Web
  Worker). The raw file **never leaves the browser** — no file-upload attack surface server-side, and
  matches RE practitioners' reluctance to upload live samples to a third party. Only extracted
  structured indicators (JSON) are sent to the backend.
- **AI report is one-shot, not a chat.** Single request → single markdown report. No conversation
  state, nothing persisted server-side.
- **Dual AI provider modes**, user-selectable: a free-tier **hosted key (Groq, via a generic
  OpenAI-compatible HTTP client — no `groq-sdk` dependency, one code path serves both hosted and
  BYOK)** as the zero-friction default, and **BYOK** for unlimited use on the user's own key. The
  hosted path is the most likely abuse target and is protected by per-IP rate limiting
  (`@fastify/rate-limit`) **and** a SQLite-backed rolling-daily global quota
  (`backend/src/lib/dailyQuota.ts`, implemented and tested) that hard-caps worst-case spend to $0.
- **File scope v1: Windows PE only**, but parsed to PEStudio depth: full raw headers, sections,
  imports/exports, classified strings, overlay data, TLS callbacks, PE Debug Directory/PDB path, and
  the undocumented MSVC Rich header (toolchain fingerprint, no name-lookup DB — raw IDs only).
  `IndicatorsJSON` carries a `format: "pe"` discriminant so ELF/Office support later is additive.
  Deliberately **not** implemented: Authenticode/digital-signature parsing (real new attack surface
  parsing untrusted ASN.1/PKCS7 — scoped as a future phase, not bundled in) and resource/VERSION_INFO
  extraction.
- **UI is a section-nav-driven dashboard, not a single scroll of cards.** Left rail (Overview, Flags,
  Header, Sections, Imports/Exports, Strings, Overlay, TLS Callbacks, Debug Info, Rich Header, AI
  Report) drives a detail panel — a seasoned RE should be able to use this instead of opening
  PEStudio. The AI Report panel is the one place a violet accent (`--ai-accent`) appears anywhere in
  the app — confined by rule (see `frontend/DESIGN.md`'s Named Rules) so it reads as a genuine bonus
  feature, never as "an AI tool with a file upload." Severity is never color-only (icon+label pairs
  with every color); nav badges only take alarm colors when backed by real `HeuristicSeverity` data.
- **Hosting: Oracle Cloud "Always Free" ARM VM, self-managed** (Docker Compose + Caddy), not a PaaS —
  deliberate choice to demonstrate real infra ownership (reverse proxy, TLS, firewall, SSH hardening)
  for the resume goal, after the GCP free trial was exhausted. Free DuckDNS subdomain + Let's Encrypt
  via Caddy for TLS. **Not started yet** — needs the user's Oracle account.
- **CI/CD security gates are load-bearing, not decorative**: gitleaks (secrets), CodeQL (SAST), Trivy
  (image/dependency CVEs, blocking on critical), Dependabot, and a fuzz-test suite specifically for
  the PE parser against malformed/adversarial input — chosen because they double as demonstrations of
  the security priority, not just pipeline mechanics. **This is the in-progress work** — see handoff
  section above.

## Tech stack

- **Frontend**: React 18 + TypeScript + Vite, hand-authored CSS design tokens (no Tailwind — a
  deliberate call made during the dashboard redesign; see `frontend/DESIGN.md` for the token system),
  `lucide-react` for icons, `react-markdown` + `remark-gfm` (deliberately **no** `rehype-raw` —
  security control against the AI report containing raw HTML).
- **Backend**: Node 20 LTS + TypeScript + Fastify (`@fastify/rate-limit`, `@fastify/helmet`,
  `@fastify/cors`), `zod` for schema validation, `pino` with redact paths for secrets,
  `better-sqlite3` for the daily hosted-quota counter, a single hand-rolled OpenAI-compatible HTTP
  client (`OpenAICompatibleProvider`) serving both the hosted-key and BYOK paths.
- **Monorepo**: pnpm workspaces (run via `npx pnpm@9.15.9 <cmd>` in this environment — global pnpm
  install hit a Windows permissions issue writing to `C:\Program Files\nodejs`; don't fight this,
  just prefix commands). Shared `packages/shared-types` holds the Zod schema for `IndicatorsJSON` and
  the report API contract so frontend and backend can never drift. Node was upgraded from a stale
  18.16.0 to 20.20.2 mid-project (via `winget install OpenJS.NodeJS.20` — the *dedicated* Node-20
  package, not the generic `OpenJS.NodeJS` with a version pin, which fails) because Fastify 5
  hard-requires it; if `better-sqlite3` ever throws a `NODE_MODULE_VERSION` mismatch again after a
  Node upgrade, the fix is `rm -rf node_modules/.pnpm/better-sqlite3@<version>` then reinstall, not
  `pnpm rebuild` (that alone didn't do it last time).

## Repository structure

```
frontend/src/parser/       # safeReader, peHeaderParser, sectionAnalyzer, importExportWalker,
                            # stringExtractor, entropyCalculator, hashCalculator, heuristics,
                            # overlayAnalyzer, tlsParser, debugDirectoryParser, richHeaderParser,
                            # indicatorsBuilder, peParser.worker.ts, runParser.ts
frontend/src/components/dashboard/   # DashboardShell, SectionNav, SeverityPill, sections.ts,
                                      # AiReportPanel, panels/{Overview,Flags,Header,Sections,
                                      # ImportsExports,Strings,Advanced(=Overlay+Tls+Debug+Rich)}Panel
frontend/src/components/   # FileDropzone, ProviderSelector, ReportView, DownloadButtons
frontend/src/lib/downloadTextFile.ts
frontend/tests/{unit,fuzz}/
frontend/fixtures/         # self-compiled BENIGN tiny PE samples only — never real malware
frontend/Dockerfile        # UNTESTED — see handoff section
frontend/Caddyfile.standalone
frontend/DESIGN.md         # shipped design system, ground-truth-recorded — read before UI work
frontend/PRODUCT.md
backend/src/routes/report.ts
backend/src/services/{promptBuilder,reportSanitizer}.ts
backend/src/providers/{ProviderClient,GroqHostedProvider,OpenAICompatibleProvider,providerRegistry}.ts
backend/src/lib/{dailyQuota,logger}.ts
backend/src/config/env.ts
backend/src/plugins/security.ts
backend/Dockerfile         # UNTESTED — see handoff section
packages/shared-types/src/{indicators,report}.ts
.github/workflows/ci.yml   # exists: lint/typecheck/test/build on push+PR
.dockerignore
```

Not created yet (referenced in the original plan, still accurate targets): `infra/{docker-compose.yml,Caddyfile,.env.example,RUNBOOK.md}` (tied to Oracle VM step), `.github/workflows/{codeql,security-scan,fuzz,cd}.yml`, `.github/dependabot.yml`, `docs/{ARCHITECTURE.md,SECURITY.md,THREAT_MODEL.md}`.

## Key security controls (see full plan for the complete table)

| Surface | Controls |
|---|---|
| PE parsing (client) | Web Worker isolation, bounds-checked reads via `SafeReader`, hard caps on all counts regardless of header claims, wall-clock timeout owned by the *main thread* (`Promise.race` + `worker.terminate()`), no dynamic code execution, fuzz-tested (locally — not yet wired into CI) |
| Indicators JSON (backend) | Re-validated server-side with the same strict Zod schema (`.strict()`) — never trust the client, since anyone can POST directly bypassing the browser parser |
| AI prompt | Untrusted indicator data delimited/tagged with explicit data-vs-instruction framing, truncated to bound size; model has no tools/function-calling |
| Hosted AI key | Per-IP rate limit + SQLite daily global quota (hard-caps worst-case spend to $0, implemented) + payload-shape validation |
| BYOK key | In-memory only for the single call, never logged (pino redact) or persisted, TLS-only, hardcoded provider base-URL allow-list (no SSRF — user selects an enum, never supplies a URL) |
| Public VM | Not built yet — planned: SSH key-only + non-root deploy user + fail2ban, ufw restricted to 22/80/443 matched at Oracle's NSG layer, Caddy auto-TLS, unattended-upgrades |
| CI pipeline | Only lint/typecheck/test/build exist today. gitleaks + CodeQL + Trivy + Dependabot are the current work-in-progress (see handoff section) |

## Roadmap

- **Phase 0 — Scaffolding**: ✅ done. Workspaces, shared TS/ESLint config, empty Fastify + Vite apps,
  CI skeleton (lint+build), LICENSE/README.
- **Phase 1 — v1 MVP**: ✅ done, exceeded scope. Full PEStudio-depth parsing → `IndicatorsJSON`;
  section-nav dashboard UI (redesigned from the original single-column MVP layout, verified via
  Impeccable's finish-review cycle); Groq hosted-mode **and** BYOK report endpoint; markdown render +
  download; live-browser-tested end-to-end (found and fixed two real Vite/Windows dev-server bugs
  along the way). Manual Oracle VM deploy **not done** — no Oracle account access yet.
- **Phase 2 — Hardening + full CI/CD**: **in progress**. Done: BYOK mode, suspicious-API heuristics,
  SQLite daily quota, AI output sanitization pass. Not done: parser fuzz suite wired into CI, full
  blocking scan suite (Trivy/CodeQL/gitleaks/Dependabot), CD pipeline (GHCR + SSH deploy) — **this is
  where the handoff section above picks up.**
- **Phase 3 — Stretch (optional)**: not started. Client-side Markdown→PDF, Playwright E2E, Rust/WASM
  entropy calculator, YARA-via-WASM, ELF/Office-macro parsers, `/healthz` + observability, Turnstile
  if hosted-mode abuse is observed.

## Fixtures policy

`frontend/fixtures/` must only ever contain **self-compiled, benign** PE files. Currently:
`hello.c`/`hello.exe` (a trivial MinGW-compiled "hello world," used as ground truth for nearly every
parser test — its exact hashes/section layout are hardcoded in test assertions and cross-checked
against `objdump`/`sha256sum` output). **Never** commit real malware samples to this repo — it must
stay safe to clone, scan, and fork.

## Licensing

MIT. Verify every new dependency stays MIT/Apache/BSD-compatible (especially any future Rust crate or
YARA-WASM binding) — avoid GPL/AGPL.

Full original plan with rationale: see conversation history (this project was built primarily in one
long Claude Code session — `docs/ARCHITECTURE.md` doesn't exist yet to summarize it independently).
