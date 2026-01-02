import { buildApp } from "./app";
import { config } from "./config/index";
import { connectDatabase, disconnectDatabase } from "./infrastructure/database/prisma";

async function main() {
  const app = await buildApp();

  // Connect to database
  await connectDatabase();

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);
      await app.close();
      await disconnectDatabase();
      process.exit(0);
    });
  });

  // Start server
  try {
    await app.listen({ port: config.server.port, host: config.server.host });
  } catch (error) {
    app.log.error(error, "Failed to start server");
    process.exit(1);
  }
}

main();