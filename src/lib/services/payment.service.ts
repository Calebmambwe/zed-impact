/**
 * Gateway-agnostic payment record service for ZedImpact.
 * Creates and updates Payment records regardless of which payment gateway was used.
 */
import type { PaymentGateway, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface CreatePaymentData {
  organizationId: string;
  donationId: string;
  amount: number;
  currency?: string;
  gateway: PaymentGateway;
  status?: PaymentStatus;
  gatewayTransactionId?: string;
  gatewayReferenceId?: string;
  metadata?: Record<string, unknown>;
  processedAt?: Date;
}

/**
 * Creates a Payment record linked to a Donation.
 * Called after a successful gateway response to record the transaction.
 *
 * @param data - Payment creation data including gateway and status
 * @returns The created Payment record
 */
export async function createPaymentRecord(data: CreatePaymentData) {
  return prisma.payment.create({
    data: {
      organizationId: data.organizationId,
      donationId: data.donationId,
      amount: data.amount,
      currency: data.currency ?? "USD",
      gateway: data.gateway,
      status: data.status ?? "PENDING",
      gatewayTransactionId: data.gatewayTransactionId ?? null,
      gatewayReferenceId: data.gatewayReferenceId ?? null,
      metadata: data.metadata ?? undefined,
      processedAt: data.processedAt ?? null,
    },
  });
}

/**
 * Updates a Payment record's status by gateway transaction ID.
 * Called by webhook handlers when payment status changes.
 *
 * @param gatewayTransactionId - The unique transaction ID from the payment gateway
 * @param status - The new payment status
 * @param processedAt - When the payment was processed (optional)
 * @returns The updated Payment record, or null if not found
 */
export async function updatePaymentStatus(
  gatewayTransactionId: string,
  status: PaymentStatus,
  processedAt?: Date
) {
  const payment = await prisma.payment.findUnique({
    where: { gatewayTransactionId },
  });

  if (!payment) {
    return null;
  }

  return prisma.payment.update({
    where: { gatewayTransactionId },
    data: {
      status,
      processedAt: processedAt ?? (status === "COMPLETED" ? new Date() : null),
    },
  });
}

/**
 * Finds a Payment record by gateway reference ID.
 * Used for mobile money callbacks that use a reference ID instead of transaction ID.
 *
 * @param gatewayReferenceId - The provider reference ID (e.g. DPO TransactionToken)
 * @returns The Payment record or null
 */
export async function findPaymentByReferenceId(gatewayReferenceId: string) {
  return prisma.payment.findFirst({
    where: { gatewayReferenceId },
    include: { donation: true },
  });
}
