import Fastify, { type FastifyInstance } from "fastify";
import { DailyQuota } from "./lib/dailyQuota.js";
import { loggerOptions } from "./lib/logger.js";
import { registerSecurityPlugins } from "./plugins/security.js";
import { registerReportRoute } from "./routes/report.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: loggerOptions,
    bodyLimit: 512 * 1024,
    // Without this, `request.ip` is the Caddy container's address for every request, so
    // @fastify/rate-limit keys its "per-IP" bucket on a single value — one global 20/min limit
    // that any one client can exhaust for everyone. Scoped to Docker's private range rather than
    // `true` so that X-Forwarded-For stays unspoofable if this service is ever published to a
    // host port directly (today it is reachable only from Caddy on the internal network).
    trustProxy: "172.16.0.0/12",
  });

  const dailyQuota = new DailyQuota();
  app.addHook("onClose", () => dailyQuota.close());

  await registerSecurityPlugins(app);
  await registerReportRoute(app, dailyQuota);

  app.get("/healthz", async () => ({ status: "ok" }));

  return app;
}
