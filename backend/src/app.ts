import Fastify, { type FastifyInstance } from "fastify";
import { loggerOptions } from "./lib/logger.js";
import { registerSecurityPlugins } from "./plugins/security.js";
import { registerReportRoute } from "./routes/report.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: loggerOptions, bodyLimit: 512 * 1024 });

  await registerSecurityPlugins(app);
  await registerReportRoute(app);

  app.get("/healthz", async () => ({ status: "ok" }));

  return app;
}
