import pino from "pino";
import { config } from "../../config/index";
import type { FastifyLoggerOptions } from "fastify";
import type { PrettyOptions } from "pino-pretty";

// Standalone logger for use outside Fastify (workers, scripts, etc.)
export const logger = pino({
  level: config.isDev ? "debug" : "info",
  ...(config.isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      } satisfies PrettyOptions,
    },
  }),
});

// Logger config for Fastify
export const fastifyLoggerConfig: FastifyLoggerOptions & { transport?: { target: string; options: PrettyOptions } } = config.isDev
  ? {
      level: "debug",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
    }
  : {
      level: "info",
    };

export type Logger = typeof logger;