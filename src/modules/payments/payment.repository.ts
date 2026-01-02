import { prisma } from "../../infrastructure/database/prisma";
import type { Payment, PaymentStatus, Prisma } from "@prisma/client";

export interface CreatePaymentData {
  invoiceId: string;
  amount: Prisma.Decimal | number | string;
  paymentMethod?: string;
}

export const paymentRepository = {
  async findById(id: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            user: true,
            items: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });
  },

  async findByPfPaymentId(pfPaymentId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { pfPaymentId },
    });
  },

  async findByInvoiceId(invoiceId: string): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(data: CreatePaymentData): Promise<Payment> {
    return prisma.payment.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        paymentMethod: data.paymentMethod ?? "payfast",
      },
    });
  },

  async update(id: string, data: Prisma.PaymentUpdateInput): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data,
    });
  },

  async updatePayFastData(
    id: string,
    pfData: {
      status: PaymentStatus;
      pfPaymentId: string;
      pfReference: string | null;
      pfPaymentStatus: string;
      rawPayload: Prisma.InputJsonValue;
      processedAt: Date;
    }
  ): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data: {
        status: pfData.status,
        pfPaymentId: pfData.pfPaymentId,
        pfReference: pfData.pfReference,
        pfPaymentStatus: pfData.pfPaymentStatus,
        pfData: pfData.rawPayload,
        processedAt: pfData.processedAt,
      },
    });
  },
};