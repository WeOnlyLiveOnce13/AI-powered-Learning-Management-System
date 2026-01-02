import type { FastifyRequest, FastifyReply } from "fastify";
import { paymentService } from "./payment.service";
import type { PayFastITNPayload } from "./payfast/payfast.types";

export const paymentController = {
  /**
   * Handle PayFast ITN (Instant Transaction Notification) webhook
   * POST /webhooks/payfast
   */
  async handlePayFastWebhook(
    request: FastifyRequest<{ Body: PayFastITNPayload }>,
    reply: FastifyReply
  ): Promise<void> {
    const payload = request.body;
    
    // Get source IP for validation
    const sourceIP = 
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
      request.ip;

    request.log.info(
      { 
        pfPaymentId: payload.pf_payment_id,
        mPaymentId: payload.m_payment_id,
        status: payload.payment_status,
        sourceIP,
      },
      "Received PayFast ITN webhook"
    );

    try {
      const result = await paymentService.processPayFastWebhook(payload, sourceIP);

      if (result.success) {
        // PayFast expects a 200 OK response with no body (or "OK")
        reply.status(200).send("OK");
      } else {
        // Still return 200 to prevent PayFast from retrying
        // Log the error but acknowledge receipt
        request.log.warn({ result }, "Webhook processed with issues");
        reply.status(200).send("OK");
      }
    } catch (error) {
      request.log.error(error, "Error processing PayFast webhook");
      // Return 200 anyway to prevent infinite retries
      // The error is logged for investigation
      reply.status(200).send("OK");
    }
  },

  /**
   * Health check for webhook endpoint
   * GET /webhooks/health
   */
  async webhookHealth(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    reply.status(200).send({ 
      status: "ok", 
      endpoint: "webhooks",
      timestamp: new Date().toISOString(),
    });
  },
};