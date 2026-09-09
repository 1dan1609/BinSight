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

## Session state

Docker was installed inside WSL2 Ubuntu 24.04 (native Windows/WSL2 both lacked a runtime before
this) and both Dockerfiles are now **built and runtime-verified**, not just reasoned through:
`docker build` succeeds for both, and each container was actually run and hit over HTTP
(`backend` → `GET /healthz` returns `{"status":"ok"}`; `frontend` → Caddy serves the built SPA on
`:80`). Two real bugs surfaced and were fixed:
- Both Dockerfiles were missing `tsconfig.base.json` in the early COPY layer — every workspace
  package's `tsconfig.json` has `"extends": "../../tsconfig.base.json"` (or `../`), so the very
  first `tsc` invocation failed with `TS5083: Cannot read file`.
- `backend/Dockerfile`'s runtime stage crashed at container *startup* (not build time): the
  non-root `app` user has no write access to `/app` (root-owned, created by `WORKDIR`), so
  `DailyQuota`'s `mkdirSync('./data')` threw `EACCES`. Fixed by pre-creating and `chown`ing
  `/app/data` before `USER app`.

To re-run these checks in a fresh session: `wsl -d Ubuntu -- bash -c "cd /mnt/c/... && docker build -f backend/Dockerfile -t binsight-backend:test ."` (same pattern for frontend). No GitHub remote
exists yet (`git remote -v` is empty) — pushing/creating the repo is still unstarted and needs the
user's decision (repo name, public/private, account), not something to do unprompted.

### What's actually left in Phase 2 (CI/CD security gates — what the user asked for last)

Done, written and locally verified against the real images/tests (not just reasoned through —
see below for how each was checked):
- `.github/workflows/security-scan.yml` — Trivy (scans both Docker images, blocks on CRITICAL,
  `ignore-unfixed: true`) + gitleaks (secret scanning on every PR, free tier since this is a
  personal-account repo, not an org). Both `aquasecurity/trivy-action` and `gitleaks/gitleaks-action`
  are pinned to full commit SHAs rather than tags — `trivy-action` and the `trivy` binary itself
  were both hit by a real supply-chain compromise in March 2026 (malicious releases injected a
  credential stealer); pinned commits here were verified to postdate that incident. Verified
  locally: built both images in WSL2 Docker, ran `aquasec/trivy:0.72.0` against each with the same
  flags the workflow uses. This is how two real CRITICAL CVEs were caught and fixed rather than
  shipped: `backend/Dockerfile` now strips npm/corepack's vendored `tar` (CVE-2026-59873) out of
  the runtime stage (npm/corepack are dead weight there anyway — the container invokes `node
  dist/server.js` directly, never `npm`); `frontend`'s finding (CVE-2026-56854, in
  `golang.org/x/crypto/ssh`, statically linked into the upstream `caddy:2-alpine` binary with no
  patched image available yet) is documented and suppressed via `.trivyignore` at repo root with a
  dated justification — Caddy is configured here purely as a static file server
  (`frontend/Caddyfile.standalone`), no SSH functionality is reachable.
- `.github/workflows/codeql.yml` — CodeQL SAST (`javascript-typescript` covers the whole monorepo:
  frontend, backend, shared-types), on push/PR to `main` + weekly schedule.
- `.github/workflows/fuzz.yml` — wires `frontend/tests/fuzz/peParserFuzz.test.ts` into CI, triggered
  on PRs touching `frontend/src/parser/**`, `frontend/tests/fuzz/**`, or `packages/shared-types/**`,
  plus a nightly schedule. Re-ran `pnpm --filter frontend test:fuzz` locally to confirm it still
  passes (8/8) before wiring it in.
- `.github/dependabot.yml` — npm (root directory; Dependabot resolves the pnpm workspace members
  from `pnpm-workspace.yaml` on its own), Dockerfile (`/backend` and `/frontend` separately), and
  github-actions ecosystems, weekly.

Not started — needs the user, can't be done from the CLI:
- Actually pushing this to GitHub (no remote configured yet) and creating the repo.
- Branch protection requiring all of the above checks before merge to `main` — configured in GitHub
  repo settings after the push.

Explicitly **out of scope** for this pass (don't drift into it unasked): the full CD pipeline
(GHCR push + SSH deploy to the Oracle VM) and `infra/docker-compose.yml`/`infra/Caddyfile` — those
are tied to the Oracle VM step, which needs the user's cloud account access and hasn't happened yet.

The Dockerfiles are confirmed building and running correctly (see Session state above), so
`security-scan.yml`'s Trivy step now has real images to scan — this is no longer blocked.

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
frontend/Dockerfile        # builds and runs verified locally via WSL2 Docker
frontend/Caddyfile.standalone
frontend/DESIGN.md         # shipped design system, ground-truth-recorded — read before UI work
frontend/PRODUCT.md
backend/src/routes/report.ts
backend/src/services/{promptBuilder,reportSanitizer}.ts
backend/src/providers/{ProviderClient,GroqHostedProvider,OpenAICompatibleProvider,providerRegistry}.ts
backend/src/lib/{dailyQuota,logger}.ts
backend/src/config/env.ts
backend/src/plugins/security.ts
backend/Dockerfile         # builds and runs verified locally via WSL2 Docker
packages/shared-types/src/{indicators,report}.ts
.github/workflows/ci.yml   # lint/typecheck/test/build on push+PR
.github/workflows/security-scan.yml  # Trivy (both images, blocks on CRITICAL) + gitleaks
.github/workflows/codeql.yml         # CodeQL SAST, push+PR to main, weekly schedule
.github/workflows/fuzz.yml           # peParserFuzz wired in, PR-on-parser-changes + nightly
.github/dependabot.yml     # npm (pnpm workspace), Dockerfile x2, github-actions
.trivyignore                # documented CRITICAL suppression — see Session state above
.dockerignore
```

`docs/ARCHITECTURE.md` exists — it's the original plan-mode document, preserved verbatim as
historical rationale (why hybrid client/server, why Oracle VM, etc.), **not current status**; it
says so at its own top. Not created yet: `infra/{docker-compose.yml,Caddyfile,.env.example,RUNBOOK.md}` (tied to Oracle VM step), `.github/workflows/cd.yml`, `docs/{SECURITY.md,THREAT_MODEL.md}`.

## Key security controls (see full plan for the complete table)

| Surface | Controls |
|---|---|
| PE parsing (client) | Web Worker isolation, bounds-checked reads via `SafeReader`, hard caps on all counts regardless of header claims, wall-clock timeout owned by the *main thread* (`Promise.race` + `worker.terminate()`), no dynamic code execution, fuzz-tested (`.github/workflows/fuzz.yml`, PR-on-parser-changes + nightly) |
| Indicators JSON (backend) | Re-validated server-side with the same strict Zod schema (`.strict()`) — never trust the client, since anyone can POST directly bypassing the browser parser |
| AI prompt | Untrusted indicator data delimited/tagged with explicit data-vs-instruction framing, truncated to bound size; model has no tools/function-calling |
| Hosted AI key | Per-IP rate limit + SQLite daily global quota (hard-caps worst-case spend to $0, implemented) + payload-shape validation |
| BYOK key | In-memory only for the single call, never logged (pino redact) or persisted, TLS-only, hardcoded provider base-URL allow-list (no SSRF — user selects an enum, never supplies a URL) |
| Public VM | Not built yet — planned: SSH key-only + non-root deploy user + fail2ban, ufw restricted to 22/80/443 matched at Oracle's NSG layer, Caddy auto-TLS, unattended-upgrades |
| CI pipeline | lint/typecheck/test/build, Trivy (blocks on CRITICAL, both images), gitleaks (every PR), CodeQL (push/PR + weekly), Dependabot (npm/Docker/GitHub Actions, weekly). Not yet run for real — no GitHub remote exists yet, so the only verification so far is local (see Session state) |

## Roadmap

- **Phase 0 — Scaffolding**: ✅ done. Workspaces, shared TS/ESLint config, empty Fastify + Vite apps,
  CI skeleton (lint+build), LICENSE/README.
- **Phase 1 — v1 MVP**: ✅ done, exceeded scope. Full PEStudio-depth parsing → `IndicatorsJSON`;
  section-nav dashboard UI (redesigned from the original single-column MVP layout, verified via
  Impeccable's finish-review cycle); Groq hosted-mode **and** BYOK report endpoint; markdown render +
  download; live-browser-tested end-to-end (found and fixed two real Vite/Windows dev-server bugs
  along the way). Manual Oracle VM deploy **not done** — no Oracle account access yet.
- **Phase 2 — Hardening + full CI/CD**: **in progress**. Done: BYOK mode, suspicious-API heuristics,
  SQLite daily quota, AI output sanitization pass, both Dockerfiles built/runtime-verified locally,
  full blocking scan suite (Trivy/CodeQL/gitleaks/Dependabot) written and locally verified. Not
  done: pushing to GitHub (no remote yet, needs the user's decision), branch protection, CD pipeline
  (GHCR + SSH deploy) — tied to the Oracle VM step below, which needs the user's cloud account.
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

Full original plan with rationale: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the plan-mode
document from before any code existed, preserved as historical record of *why*, not current status.
