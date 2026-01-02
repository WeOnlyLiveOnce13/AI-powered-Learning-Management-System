import { prisma } from "../../infrastructure/database/prisma";
import type { Invoice, InvoiceStatus } from "@prisma/client";

export const invoiceRepository = {
  async findById(id: string): Promise<Invoice | null> {
    return prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        user: true,
      },
    });
  },

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    return prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        items: true,
        user: true,
      },
    });
  },

  async updateStatus(id: string, status: InvoiceStatus, paidAt?: Date): Promise<Invoice> {
    return prisma.invoice.update({
      where: { id },
      data: {
        status,
        ...(paidAt && { paidAt }),
      },
    });
  },
};