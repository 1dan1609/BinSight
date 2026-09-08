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
    // discover its dependencies through it. Without this, Vite lazily re-optimizes mid-session
    // the first time a file is actually parsed, and that re-optimization's temp-dir cleanup hits
    // a Windows file-lock race (EPERM on rmdir) that crashes the dev server. Declaring them here
    // makes Vite pre-bundle them upfront instead. zod is a genuine runtime dependency of the
    // worker (via @pe-analyzer/shared-types executing its Zod schema definitions at module load,
    // not just types) — it's listed as a direct dependency in package.json specifically so pnpm
    // hoists it into this package's own node_modules and optimizeDeps.include can resolve it.
    include: ["spark-md5", "zod"],
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
