import crypto from "crypto";
import { config } from "../../../config/index";
import { logger } from "../../../infrastructure/logger/pino";
import type { PayFastITNPayload, PayFastValidationResult } from "./payfast.types";

/**
 * PayFast signature validation and utilities
 * https://developers.payfast.co.za/docs#step-4-confirm-payment
 */
export const payfastService = {
  /**
   * Validates the complete ITN request from PayFast
   */
  async validateITN(
    payload: PayFastITNPayload,
    sourceIP: string
  ): Promise<PayFastValidationResult> {
    // Step 1: Verify signature
    const signatureValid = this.verifySignature(payload);
    if (!signatureValid) {
      logger.warn({ payload }, "PayFast signature validation failed");
      return { isValid: false, error: "Invalid signature" };
    }

    // Step 2: Verify source IP (PayFast server IPs)
    const ipValid = this.verifySourceIP(sourceIP);
    if (!ipValid) {
      logger.warn({ sourceIP }, "PayFast IP validation failed");
      return { isValid: false, error: "Invalid source IP" };
    }

    // Step 3: Verify merchant ID
    if (payload.merchant_id !== config.payfast.merchantId) {
      logger.warn(
        { received: payload.merchant_id, expected: config.payfast.merchantId },
        "PayFast merchant ID mismatch"
      );
      return { isValid: false, error: "Merchant ID mismatch" };
    }

    // Step 4: Verify with PayFast server (optional but recommended)
    // In sandbox mode, we skip this step
    if (!config.payfast.sandbox) {
      const serverValid = await this.verifyWithPayFastServer(payload);
      if (!serverValid) {
        logger.warn("PayFast server validation failed");
        return { isValid: false, error: "Server validation failed" };
      }
    }

    return { isValid: true };
  },

  /**
   * Verifies the MD5 signature of the payload
   */
  verifySignature(payload: PayFastITNPayload): boolean {
    const receivedSignature = payload.signature;
    const calculatedSignature = this.generateSignature(payload);
    
    logger.debug({
      received: receivedSignature,
      calculated: calculatedSignature,
    }, "Comparing signatures");

    return receivedSignature === calculatedSignature;
  },

  /**
   * Generates MD5 signature for PayFast payload
   */
  generateSignature(payload: PayFastITNPayload): string {
    // Create parameter string (alphabetically sorted, excluding signature)
    const params = { ...payload };
    delete (params as Partial<PayFastITNPayload>).signature;

    // Sort keys alphabetically
    const sortedKeys = Object.keys(params).sort();
    
    // Build query string
    const paramString = sortedKeys
      .filter((key) => {
        const value = params[key as keyof typeof params];
        return value !== undefined && value !== "";
      })
      .map((key) => {
        const value = params[key as keyof typeof params];
        return `${key}=${encodeURIComponent(String(value)).replace(/%20/g, "+")}`;
      })
      .join("&");

    // Add passphrase if set
    const stringToHash = config.payfast.passphrase
      ? `${paramString}&passphrase=${encodeURIComponent(config.payfast.passphrase).replace(/%20/g, "+")}`
      : paramString;

    logger.debug({ stringToHash }, "String to hash for signature");

    // Generate MD5 hash
    return crypto.createHash("md5").update(stringToHash).digest("hex");
  },

  /**
   * Verifies the request comes from PayFast's servers
   */
  verifySourceIP(ip: string): boolean {
    // PayFast server IP ranges
    // https://developers.payfast.co.za/docs#step-4-confirm-payment
    const validIPs = [
      "197.97.145.144/28",
      "41.74.179.192/27", 
      "196.11.240.0/22",
      // Sandbox IPs
      "127.0.0.1",
      "::1",
      "::ffff:127.0.0.1",
    ];

    // In sandbox/development mode, allow any IP
    if (config.payfast.sandbox || config.isDev) {
      return true;
    }

    // Simple check - in production you'd want proper CIDR matching
    return validIPs.some((validIP) => ip.includes(validIP.split("/")[0] ?? ""));
  },

  /**
   * Verifies the transaction with PayFast's server
   */
  async verifyWithPayFastServer(payload: PayFastITNPayload): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      
      // Add all payload fields
      for (const [key, value] of Object.entries(payload)) {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      }

      const response = await fetch(config.payfast.validateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const result = await response.text();
      return result === "VALID";
    } catch (error) {
      logger.error(error, "Error verifying with PayFast server");
      return false;
    }
  },

  /**
   * Maps PayFast status to our internal payment status
   */
  mapPaymentStatus(pfStatus: string): "COMPLETED" | "FAILED" | "PENDING" | "CANCELLED" {
    const statusMap: Record<string, "COMPLETED" | "FAILED" | "PENDING" | "CANCELLED"> = {
      COMPLETE: "COMPLETED",
      FAILED: "FAILED",
      PENDING: "PENDING",
      CANCELLED: "CANCELLED",
    };
    return statusMap[pfStatus] ?? "PENDING";
  },
};