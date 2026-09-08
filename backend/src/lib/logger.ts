import type { FastifyLoggerOptions } from "fastify";
import type { PinoLoggerOptions } from "fastify/types/logger.js";

export const loggerOptions: FastifyLoggerOptions & PinoLoggerOptions = {
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: ["req.body.byokConfig.apiKey", "req.headers.authorization", "*.apiKey"],
    censor: "[REDACTED]",
  },
};
