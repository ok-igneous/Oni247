import superjson from "superjson";
import { db } from "../../helpers/db";
import { refreshBookingPayment } from "../../helpers/bookingPayments";
import { refreshOrderPayment } from "../../helpers/orderPayments";
import { refreshLinkPayment } from "../../helpers/linkPayments";

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/**
 * Gateways call this when a payment changes. The body is NOT trusted: it is only used to find the
 * booking, then the gateway is asked directly whether the money arrived. Always answers 200.
 */
export async function handle(request: Request) {
  const ok = () => new Response(superjson.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  try {
    const url = new URL(request.url);
    const businessId = url.searchParams.get("b") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(businessId)) return ok();
    let body: Record<string, unknown> = {};
    try {
      body = obj(JSON.parse(await request.text()));
    } catch {
      return ok();
    }
    const data = obj(body.data);
    const stripeObject = obj(data.object);
    const reference = [data.reference, data.tx_ref, data.txRef, stripeObject.client_reference_id, obj(stripeObject.metadata).reference].find((v): v is string => typeof v === "string" && v.length > 0);
    if (!reference) return ok();
    if (reference.startsWith("pl-")) {
      const payment = await db.selectFrom("linkPayments").selectAll().where("businessId", "=", businessId).where("reference", "=", reference).executeTakeFirst();
      if (payment) await refreshLinkPayment(payment);
      return ok();
    }
    if (reference.startsWith("ord-")) {
      const order = await db.selectFrom("orders").selectAll().where("businessId", "=", businessId).where("paymentReference", "=", reference).executeTakeFirst();
      if (order) await refreshOrderPayment(order);
      return ok();
    }
    const booking = await db.selectFrom("serviceBookings").selectAll().where("businessId", "=", businessId).where("paymentReference", "=", reference).executeTakeFirst();
    if (booking) await refreshBookingPayment(booking, url.origin);
    return ok();
  } catch {
    return ok();
  }
}
