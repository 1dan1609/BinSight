import Fastify from "fastify";
import { env } from "./config/env.js";
import { loggerOptions } from "./lib/logger.js";
import { registerSecurityPlugins } from "./plugins/security.js";

const app = Fastify({ logger: loggerOptions, bodyLimit: 512 * 1024 });

await registerSecurityPlugins(app);

app.get("/healthz", async () => ({ status: "ok" }));

app
  .listen({ port: env.PORT, host: env.HOST })
  .then((address) => {
    app.log.info(`Backend listening at ${address}`);
  })
  .catch((err: unknown) => {
    app.log.error(err);
    process.exit(1);
  });
