# BinSight

Static analysis for Windows PE (malware) files, for reverse engineers. Parsing runs entirely in
your browser — **the file never leaves your machine**. Only extracted, structured indicators
(headers, sections, entropy, imports, strings — never the binary itself) are sent to a backend
that generates a one-shot AI report summarizing flags and suggested dynamic-analysis next steps.

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

## Repository layout

- `frontend/` — React + TypeScript + Vite. PE parsing runs client-side in a Web Worker.
- `backend/` — Node + Fastify. Thin, stateless AI-report proxy; never receives the raw file.
- `packages/shared-types/` — Zod schema shared between frontend (producer) and backend (validator).

## License

MIT — see [LICENSE](LICENSE).
