import superjson from "superjson";
import { nanoid } from "nanoid";
import { db } from "../../helpers/db";
import { decryptSecret } from "../../helpers/mailCrypto";
import { initCheckout } from "../../helpers/gatewayApi";
import { refreshBookingPayment } from "../../helpers/bookingPayments";
import type { GatewayProvider } from "../../helpers/paymentProviders";
import { schema, type OutputType } from "./pay_POST.schema";

const fail = (error: string, status: number) => new Response(superjson.stringify({ error }), { status });

/** Opens a fresh payment page for a booking that is still unpaid. */
export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const business = await db.selectFrom("businesses").select(["id", "name", "slug", "currency"]).where("slug", "=", input.slug).where("status", "=", "published").executeTakeFirst();
    const booking = business ? await db.selectFrom("serviceBookings").selectAll().where("businessId", "=", business.id).where("code", "=", input.code.toUpperCase()).executeTakeFirst() : undefined;
    if (!business || !booking) return fail("We could not find that booking.", 404);
    if (booking.paymentStatus !== "unpaid" || booking.status === "cancelled" || booking.checkoutMode === "enquiry") return fail("This booking does not need a payment.", 400);
    if (!booking.customerEmail) return fail("This booking has no email address for the payment receipt.", 400);

    // If an earlier attempt actually went through, settle it instead of charging twice.
    if (booking.paymentReference && (await refreshBookingPayment(booking, new URL(request.url).origin)) === "paid") return fail("This booking is already paid.", 409);

    const gateway = await db.selectFrom("paymentGateways").selectAll().where("businessId", "=", business.id).where("enabled", "=", true).limit(1).executeTakeFirst();
    if (!gateway) return fail("Online payment is not available right now.", 400);
    const origin = new URL(request.url).origin;
    const reference = `bk-${booking.code}-${nanoid(6)}`.replace(/[^A-Za-z0-9-]/g, "");
    const back = `${origin}/store/${business.slug}/booking/${booking.code}`;
    const started = await initCheckout(gateway.provider as GatewayProvider, await decryptSecret(gateway.secretEnc), {
      reference,
      amount: Number.parseFloat(booking.amountDue),
      currency: booking.currency,
      email: booking.customerEmail,
      name: booking.customerName,
      phone: booking.customerPhone ?? undefined,
      title: `${booking.serviceName} — ${business.name}`,
      description: `Payment for ${booking.serviceName}`,
      returnUrl: back,
      cancelUrl: back,
    });
    if (!started.ok) return fail(started.error, 502);
    await db.updateTable("serviceBookings").set({ paymentProvider: gateway.provider, paymentReference: reference, providerRef: started.providerRef ?? null, updatedAt: new Date() }).where("id", "=", booking.id).execute();
    return new Response(superjson.stringify({ paymentUrl: started.url } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not start the payment.", 400);
  }
}
