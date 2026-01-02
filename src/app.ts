import Fastify, { FastifyInstance } from "fastify";
import { fastifyLoggerConfig } from "./infrastructure/logger/pino";
import { registerRoutes } from "./routes/index";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: fastifyLoggerConfig,
  });

  // Add content type parser for application/x-www-form-urlencoded
  // PayFast sends webhooks in this format
  app.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    (req, body, done) => {
      try {
        const parsed = Object.fromEntries(new URLSearchParams(body as string));
        done(null, parsed);
      } catch (error) {
        done(error as Error, undefined);
      }
    }
  );

  // Register API routes
  await registerRoutes(app);

  // Health check route (root level)
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Root route
  app.get("/", async () => {
    return { message: "LMS Backend API", version: "1.0.0" };
  });

  return app;
}