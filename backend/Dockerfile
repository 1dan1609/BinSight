# syntax=docker/dockerfile:1

FROM node:26-alpine AS build
RUN corepack enable
# better-sqlite3 is a native module: if no prebuilt binary matches Alpine's musl libc,
# its install script falls back to compiling from source, which needs these.
RUN apk add --no-cache python3 make g++
WORKDIR /repo

# Copy workspace manifests first for layer caching. All three members' package.json files are
# needed even though this image only builds backend: pnpm validates the on-disk workspace
# structure against pnpm-lock.yaml's importers, and a missing member fails the install.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN pnpm install --frozen-lockfile

COPY packages/shared-types packages/shared-types
COPY backend backend
RUN pnpm --filter @pe-analyzer/shared-types build
RUN pnpm --filter @pe-analyzer/backend build

# pnpm deploy produces a self-contained, non-symlinked install for one workspace package —
# the standard way to get a correct, minimal production node_modules out of a pnpm monorepo.
RUN pnpm --filter @pe-analyzer/backend deploy --prod /deploy/backend

FROM node:26-alpine AS runtime
# dumb-init: proper signal handling as PID 1. libstdc++: better-sqlite3's native addon links
# against it at runtime; it's part of the build toolchain but not the bare alpine base.
RUN apk add --no-cache dumb-init libstdc++
WORKDIR /app

# Non-root: this process never needs to be root, and it's the network-facing half of the app.
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /deploy/backend .

# DailyQuota's SQLite file lives under ./data (relative to WORKDIR) and mkdir's it at startup;
# WORKDIR is root-owned by default, so the non-root user below needs this pre-created and owned.
RUN mkdir -p /app/data && chown app:app /app/data

# The base image's bundled npm/corepack are never used at runtime (CMD calls node directly on
# the pnpm-deployed build output) and npm's vendored `tar` has shipped a CRITICAL CVE
# (CVE-2026-59873) in every node:20-alpine build to date — removing them drops it from the image
# entirely instead of waiting on an upstream fix or carrying a Trivy ignore for unused code.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

USER app
ENV NODE_ENV=production
EXPOSE 8787
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
