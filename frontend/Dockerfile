# syntax=docker/dockerfile:1

FROM node:26-alpine AS build
RUN corepack enable
WORKDIR /repo

# All three workspace members' package.json files are needed even though this image only builds
# frontend: pnpm validates the on-disk workspace structure against pnpm-lock.yaml's importers.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN pnpm install --frozen-lockfile

COPY packages/shared-types packages/shared-types
COPY frontend frontend
RUN pnpm --filter @pe-analyzer/shared-types build
RUN pnpm --filter @pe-analyzer/frontend build

# Caddy serves the static build. This standalone Caddyfile is for this image (and CI/Trivy
# scanning); the real deployment mounts infra/Caddyfile instead, which adds the reverse proxy
# to the backend — see infra/RUNBOOK.md once that lands.
FROM caddy:2-alpine AS runtime
COPY --from=build /repo/frontend/dist /srv
COPY frontend/Caddyfile.standalone /etc/caddy/Caddyfile
EXPOSE 80
