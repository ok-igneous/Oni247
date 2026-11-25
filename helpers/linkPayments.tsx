import { db } from "./db";
import { decryptSecret } from "./mailCrypto";
import { verifyPayment } from "./gatewayApi";
import type { GatewayProvider } from "./paymentProviders";

type LinkPaymentRow = {
  id: string;
  businessId: string;
  reference: string;
  providerRef: string | null;
  provider: string | null;
  amount: string;
  currency: string;
  status: string;
};

/**
 * Asks the shop's gateway whether a payment-link payment arrived and records the answer.
 * Safe from a webhook, the return page or the dashboard: the gateway decides, never the caller. Backend only.
 */
export const refreshLinkPayment = async (payment: LinkPaymentRow): Promise<"paid" | "pending" | "failed"> => {
  if (payment.status === "paid") return "paid";
  if (payment.status === "failed") return "failed";
  if (!payment.provider) return "pending";
  const gateway = await db.selectFrom("paymentGateways").select("secretEnc").where("businessId", "=", payment.businessId).where("provider", "=", payment.provider).executeTakeFirst();
  if (!gateway?.secretEnc) return "pending";
  const result = await verifyPayment(payment.provider as GatewayProvider, await decryptSecret(gateway.secretEnc), {
    reference: payment.reference,
    providerRef: payment.providerRef,
    amount: Number.parseFloat(payment.amount),
    currency: payment.currency,
  });
  if (result.status === "paid") {
    await db.updateTable("linkPayments").set({ status: "paid", paidAt: new Date(), updatedAt: new Date() }).where("id", "=", payment.id).where("status", "=", "pending").execute();
  } else if (result.status === "failed") {
    await db.updateTable("linkPayments").set({ status: "failed", updatedAt: new Date() }).where("id", "=", payment.id).where("status", "=", "pending").execute();
  }
  return result.status;
};
