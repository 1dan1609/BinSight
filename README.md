# BinSight

A static-analysis dashboard for Windows PE files, built for reverse engineers and malware
analysts who want a fast, trustworthy first-pass triage of a suspicious binary. Live at
[binsight.duckdns.org](https://binsight.duckdns.org).

Parsing runs entirely client-side, in a Web Worker in your browser. The file itself never leaves
your machine: only extracted, structured indicators (headers, sections, entropy, imports, strings)
are ever sent to a server, and only if you ask for an AI-generated report. There is no
file-upload attack surface on the backend, and nothing to trust with a live sample beyond your
own browser.

## What it does

The dashboard is the product. It parses a PE file to PEStudio-level depth and presents it as a
section-driven workbench rather than a single long scroll:

- **Overview**: file identity, hashes (MD5/SHA1/SHA256), and a summary of what was found.
- **Flags**: heuristic findings (suspicious API combinations, packing indicators, overlay data,
  TLS callbacks, non-standard sections) ranked by severity.
- **Header**: full raw DOS/NT/optional header fields.
- **Sections**: the section table with per-section entropy and anomaly detection.
- **Imports / Exports**: full import/export tables, including ordinal-only imports.
- **Strings**: extracted and classified strings (URLs, IPs, registry keys, suspicious keywords).
- **Overlay**: data appended after the last section, a common spot for a hidden payload.
- **TLS Callbacks**: code that runs before the declared entry point, a known anti-sandbox trick.
- **Debug Info**: PE Debug Directory / CodeView PDB path, which often leaks build-machine paths.
- **Rich Header**: the undocumented MSVC toolchain fingerprint, decoded without a name-lookup
  database (raw compiler/linker IDs only).

Layered on top, clearly separated from the rest of the UI, is a one-shot **AI Report**: a single
generated markdown document summarizing the flags and suggesting concrete next steps for dynamic
analysis (with real RVAs and file offsets where relevant), skipped when the file looks benign. It
is a bonus feature, not the reason the tool exists: you can get full value from BinSight with the
AI report panel untouched.

Two ways to generate a report: a free hosted mode (rate-limited, backed by a small daily quota so
worst-case cost is bounded) or bring-your-own API key across nine OpenAI-compatible providers
(Groq, OpenAI, OpenRouter, Gemini, DeepSeek, Mistral, Together, Cerebras, xAI; OpenRouter also
reaches Claude and most open models). A BYOK key is used in memory for a single request and never
stored or logged.

v1 scope is Windows PE files only. Deliberately not implemented: Authenticode/digital-signature
parsing (real attack surface in untrusted ASN.1/PKCS7 parsing, scoped as a future phase) and
resource/VERSION_INFO extraction.

## Architecture

- **Client-side parser** (`frontend/src/parser/`): bounds-checked reads, hard caps on every count
  regardless of what the header claims, a wall-clock timeout owned by the main thread, no dynamic
  code execution. Fuzz-tested against malformed and adversarial input.
- **Backend** (`backend/`): a thin, stateless proxy. Re-validates incoming indicators against the
  same strict schema the frontend produces, builds a prompt that delimits untrusted data against
  injection, and calls the selected AI provider. It never receives the raw file and holds no
  per-user state.
- **Shared types** (`packages/shared-types/`): a Zod schema for the indicators JSON and the report
  API contract, used by both sides so frontend and backend cannot drift apart.

## Development

Requires Node 20+ and `pnpm` (this repo pins `packageManager` in `package.json`; use
`corepack enable` or `npx pnpm` if you don't have it installed globally).

```bash
pnpm install
pnpm --filter shared-types build   # build the shared schema package first
pnpm dev:frontend                  # http://localhost:5173
pnpm dev:backend                   # http://localhost:8787
```

```bash
pnpm -r typecheck
pnpm -r lint
pnpm -r test
pnpm -r build
```

To run hosted-mode AI reports locally, copy `infra/.env.example`, fill in a `GROQ_API_KEY`, and
point the backend at it. BYOK mode needs no server-side configuration at all.

## Repository layout

```
frontend/               React + TypeScript + Vite. PE parsing runs client-side in a Web Worker.
backend/                Node + Fastify. Stateless AI-report proxy; never receives the raw file.
packages/shared-types/  Zod schema shared between frontend (producer) and backend (validator).
infra/                  Docker Compose, Caddy config, and deployment runbook for the live VM.
```

## Security

- The raw file never leaves the browser; only derived indicators are ever transmitted.
- The parser fails safely on truncated, corrupted, or hostile input: no crashes, hangs, or
  unbounded resource use. It is fuzz-tested in CI on every change and nightly.
- Server-side indicator validation never trusts the client, since anyone can POST directly.
- AI output is sanitized before rendering (no raw HTML, markdown-only) and length-capped.
- Hosted AI mode is protected by per-IP rate limiting and a rolling daily quota that caps
  worst-case spend to $0; BYOK keys are used in memory for one call and never persisted or logged.
- CI enforces linting, type checks, tests, CodeQL SAST, Trivy image scanning (blocking on
  critical CVEs), gitleaks secret scanning, and Dependabot updates on every pull request.

## License

MIT. See [LICENSE](LICENSE).
