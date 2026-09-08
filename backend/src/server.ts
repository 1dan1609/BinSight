import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const app = await buildApp();

app
  .listen({ port: env.PORT, host: env.HOST })
  .then((address) => {
    app.log.info(`Backend listening at ${address}`);
  })
  .catch((err: unknown) => {
    app.log.error(err);
    process.exit(1);
  });
