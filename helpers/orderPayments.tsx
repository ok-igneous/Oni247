import { db } from "./db";
import { decryptSecret } from "./mailCrypto";
import { verifyPayment } from "./gatewayApi";
import type { GatewayProvider } from "./paymentProviders";

type OrderRow = {
  id: string;
  businessId: string;
  totalAmount: string;
  currency: string;
  paymentStatus: string;
  paymentProvider: string | null;
  paymentReference: string | null;
  providerRef: string | null;
};

/**
 * Checks an unpaid online order with its gateway and marks it paid if the money arrived.
 * Safe from a webhook, the return page or the dashboard: the gateway decides, never the caller. Backend only.
 */
export const refreshOrderPayment = async (order: OrderRow): Promise<"paid" | "pending" | "failed"> => {
  if (order.paymentStatus === "paid") return "paid";
  if (!order.paymentProvider || !order.paymentReference) return "pending";
  const gateway = await db
    .selectFrom("paymentGateways")
    .select("secretEnc")
    .where("businessId", "=", order.businessId)
    .where("provider", "=", order.paymentProvider)
    .executeTakeFirst();
  if (!gateway?.secretEnc) return "pending";
  const result = await verifyPayment(order.paymentProvider as GatewayProvider, await decryptSecret(gateway.secretEnc), {
    reference: order.paymentReference,
    providerRef: order.providerRef,
    amount: Number.parseFloat(order.totalAmount),
    currency: order.currency,
  });
  if (result.status === "paid") {
    await db
      .updateTable("orders")
      .set({ paymentStatus: "paid", paidAt: new Date(), updatedAt: new Date() })
      .where("id", "=", order.id)
      .where("paymentStatus", "=", "unpaid")
      .execute();
  }
  return result.status;
};

