import type { FastifyInstance } from "fastify";
import { paymentRoutes } from "../modules/payments/payment.routes";

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // API version prefix
  fastify.register(async (api) => {
    // Webhook routes (no auth required - external services call these)
    api.register(paymentRoutes, { prefix: "/webhooks" });

    // Future routes will be registered here:
    // api.register(userRoutes, { prefix: "/users" });
    // api.register(courseRoutes, { prefix: "/courses" });
    // api.register(invoiceRoutes, { prefix: "/invoices" });
  }, { prefix: "/api/v1" });
}