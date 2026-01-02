import { logger } from "../../infrastructure/logger/pino";
import { paymentRepository } from "./payment.repository";
import { invoiceRepository } from "../invoices/invoice.repository";
import { enrollmentRepository } from "../enrollments/enrollment.repository";
import { payfastService } from "./payfast/payfast.service";
import type { PayFastITNPayload, ProcessedPayFastPayment } from "./payfast/payfast.types";
import type { Prisma } from "@prisma/client";

export const paymentService = {
  /**
   * Process incoming PayFast ITN webhook
   */
  async processPayFastWebhook(
    payload: PayFastITNPayload,
    sourceIP: string
  ): Promise<ProcessedPayFastPayment> {
    const logContext = {
      pfPaymentId: payload.pf_payment_id,
      mPaymentId: payload.m_payment_id,
      status: payload.payment_status,
    };

    logger.info(logContext, "Processing PayFast webhook");

    // Step 1: Validate the ITN
    const validation = await payfastService.validateITN(payload, sourceIP);
    if (!validation.isValid) {
      logger.warn({ ...logContext, error: validation.error }, "ITN validation failed");
      return {
        success: false,
        paymentId: payload.m_payment_id,
        pfPaymentId: payload.pf_payment_id,
        status: payload.payment_status,
        message: validation.error ?? "Validation failed",
      };
    }

    // Step 2: Check for duplicate processing
    const existingPayment = await paymentRepository.findByPfPaymentId(payload.pf_payment_id);
    if (existingPayment) {
      logger.info(logContext, "Payment already processed, skipping");
      return {
        success: true,
        paymentId: existingPayment.id,
        pfPaymentId: payload.pf_payment_id,
        status: payload.payment_status,
        message: "Payment already processed",
      };
    }

    // Step 3: Find the payment record by m_payment_id (our payment ID)
    // We use custom_str2 for invoiceId
    const invoiceId = payload.custom_str2;
    const paymentId = payload.m_payment_id;

    if (!invoiceId) {
      logger.error(logContext, "Missing invoiceId in custom_str2");
      return {
        success: false,
        paymentId: paymentId,
        pfPaymentId: payload.pf_payment_id,
        status: payload.payment_status,
        message: "Missing invoice reference",
      };
    }

    // Step 4: Find or verify the payment exists
    let payment = await paymentRepository.findById(paymentId);
    
    if (!payment) {
      // Payment might not exist yet, find invoice and create payment
      const invoice = await invoiceRepository.findById(invoiceId);
      if (!invoice) {
        logger.error({ ...logContext, invoiceId }, "Invoice not found");
        return {
          success: false,
          paymentId: paymentId,
          pfPaymentId: payload.pf_payment_id,
          status: payload.payment_status,
          message: "Invoice not found",
        };
      }

      // Create the payment record
      payment = await paymentRepository.create({
        invoiceId: invoice.id,
        amount: payload.amount_gross,
      });
    }

    // Step 5: Update payment with PayFast data
    const internalStatus = payfastService.mapPaymentStatus(payload.payment_status);
    
    await paymentRepository.updatePayFastData(payment.id, {
      status: internalStatus,
      pfPaymentId: payload.pf_payment_id,
      pfReference: payload.item_name ?? null,
      pfPaymentStatus: payload.payment_status,
      rawPayload: payload as unknown as Prisma.InputJsonValue,
      processedAt: new Date(),
    });

    logger.info({ ...logContext, internalStatus }, "Payment record updated");

    // Step 6: If payment is complete, update invoice and unlock courses
    if (payload.payment_status === "COMPLETE") {
      await this.handleSuccessfulPayment(invoiceId, payload.custom_str1);
    }

    return {
      success: true,
      paymentId: payment.id,
      pfPaymentId: payload.pf_payment_id,
      status: payload.payment_status,
      message: "Payment processed successfully",
    };
  },

  /**
   * Handle successful payment: update invoice, unlock course access
   */
  async handleSuccessfulPayment(invoiceId: string, userId: string | undefined): Promise<void> {
    logger.info({ invoiceId, userId }, "Handling successful payment");

    // Update invoice status to PAID
    const invoice = await invoiceRepository.updateStatus(invoiceId, "PAID", new Date());
    logger.info({ invoiceId, status: "PAID" }, "Invoice status updated");

    // Get invoice with items to unlock courses
    const invoiceWithItems = await invoiceRepository.findById(invoiceId);
    if (!invoiceWithItems || !("items" in invoiceWithItems)) {
      logger.warn({ invoiceId }, "Invoice items not found");
      return;
    }

    // Unlock course access for each item
    const items = invoiceWithItems.items as Array<{ courseId: string }>;
    const invoiceUserId = userId ?? invoiceWithItems.userId;

    for (const item of items) {
      try {
        await enrollmentRepository.upsertActive(invoiceUserId, item.courseId);
        logger.info(
          { userId: invoiceUserId, courseId: item.courseId },
          "Course access unlocked"
        );
      } catch (error) {
        logger.error(
          { error, userId: invoiceUserId, courseId: item.courseId },
          "Failed to unlock course access"
        );
      }
    }
  },
};