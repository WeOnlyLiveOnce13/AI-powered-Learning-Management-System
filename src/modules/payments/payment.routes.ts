import type { FastifyInstance } from "fastify";
import { paymentController } from "./payment.controller";

export async function paymentRoutes(fastify: FastifyInstance): Promise<void> {
  // PayFast ITN webhook endpoint
  fastify.post("/payfast", paymentController.handlePayFastWebhook);

  // Webhook health check
  fastify.get("/health", paymentController.webhookHealth);
}