import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "../../config/index";
import { logger } from "../logger/pino";

const pool = new Pool({ connectionString: config.database.url });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error(error, "Failed to connect to database");
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
  logger.info("Database disconnected");
}