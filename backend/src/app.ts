import Fastify, { type FastifyInstance } from "fastify";
import { DailyQuota } from "./lib/dailyQuota.js";
import { loggerOptions } from "./lib/logger.js";
import { registerSecurityPlugins } from "./plugins/security.js";
import { registerReportRoute } from "./routes/report.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: loggerOptions, bodyLimit: 512 * 1024 });

  const dailyQuota = new DailyQuota();
  app.addHook("onClose", () => dailyQuota.close());

  await registerSecurityPlugins(app);
  await registerReportRoute(app, dailyQuota);

  app.get("/healthz", async () => ({ status: "ok" }));

  return app;
}
