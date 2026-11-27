import { nanoid } from "nanoid";
import { db } from "./db";
import { decryptSecret } from "./mailCrypto";
import { initCheckout } from "./gatewayApi";
import type { GatewayProvider } from "./paymentProviders";

export type StartOrderPaymentResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Opens a hosted payment page for an unpaid online order, using the shop's own enabled gateway.
 * Amount and currency come from the order row, never from the browser. Backend only.
 */
export const startOrderPayment = async (
  order: { id: string; businessId: string; trackingCode: string; totalAmount: string; currency: string; customerName: string; customerPhone: string | null; customerEmail: string | null },
  business: { name: string; slug: string },
  origin: string,
): Promise<StartOrderPaymentResult> => {
  if (!order.customerEmail) return { ok: false, error: "An email address is needed to pay online." };
  const gateway = await db.selectFrom("paymentGateways").selectAll().where("businessId", "=", order.businessId).where("enabled", "=", true).limit(1).executeTakeFirst();
  if (!gateway) return { ok: false, error: "Online payment is not available right now." };
  const reference = `ord-${order.trackingCode}-${nanoid(6)}`.replace(/[^A-Za-z0-9-]/g, "");
  const back = `${origin}/${encodeURIComponent(business.slug)}/checkout?ref=${encodeURIComponent(order.trackingCode)}`;
  const started = await initCheckout(gateway.provider as GatewayProvider, await decryptSecret(gateway.secretEnc), {
    reference,
    amount: Number.parseFloat(order.totalAmount),
    currency: order.currency,
    email: order.customerEmail,
    name: order.customerName,
    phone: order.customerPhone ?? undefined,
    title: `Order ${order.trackingCode} — ${business.name}`,
    description: `Payment for order ${order.trackingCode}`,
    returnUrl: back,
    cancelUrl: back,
  });
  if (!started.ok) return { ok: false, error: started.error };
  await db
    .updateTable("orders")
    .set({ paymentProvider: gateway.provider, paymentReference: reference, providerRef: started.providerRef ?? null, updatedAt: new Date() })
    .where("id", "=", order.id)
    .execute();
  return { ok: true, url: started.url };
};

