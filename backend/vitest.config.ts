import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      GROQ_API_KEY: "test-groq-key-not-real",
      ALLOWED_ORIGIN: "http://localhost:5173",
      SQLITE_PATH: ":memory:",
    },
  },
});
