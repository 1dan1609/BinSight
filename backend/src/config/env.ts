import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default("0.0.0.0"),
  ALLOWED_ORIGIN: z.string().default("http://localhost:5173"),
  GROQ_API_KEY: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  DAILY_QUOTA_MAX: z.coerce.number().int().positive().default(200),
  SQLITE_PATH: z.string().default("./data/quota.db"),
});

export const env = EnvSchema.parse(process.env);
export type Env = z.infer<typeof EnvSchema>;
