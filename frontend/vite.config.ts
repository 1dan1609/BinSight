import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  worker: {
    format: "es",
  },
  optimizeDeps: {
    // The PE parser worker (frontend/src/parser/peParser.worker.ts) is only reachable via a
    // dynamic `new Worker(new URL(...))` at runtime, so Vite's initial dependency scan can't
    // discover spark-md5 through it. Without this, Vite lazily re-optimizes mid-session the
    // first time a file is actually parsed, and that re-optimization's temp-dir cleanup hits a
    // Windows file-lock race (EPERM on rmdir) that crashes the dev server. Declaring it here
    // makes Vite pre-bundle it upfront instead. (zod is NOT listed here: it's only a transitive
    // dependency via @pe-analyzer/shared-types, not a direct one, so forcing it through
    // optimizeDeps.include fails bare-specifier resolution under pnpm's strict linking — Vite's
    // normal lazy discovery resolves it correctly via shared-types' own node_modules instead.)
    include: ["spark-md5"],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
