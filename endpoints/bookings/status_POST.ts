import superjson from "superjson";
import { db } from "../../helpers/db";
import { refreshBookingPayment } from "../../helpers/bookingPayments";
import { schema, type OutputType } from "./status_POST.schema";

/** The booking page a customer returns to. Re-checks an unpaid payment with the gateway every time it is opened. */
export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const business = await db.selectFrom("businesses").select(["id", "name", "slug"]).where("slug", "=", input.slug).where("status", "=", "published").executeTakeFirst();
    let booking = business ? await db.selectFrom("serviceBookings").selectAll().where("businessId", "=", business.id).where("code", "=", input.code.toUpperCase()).executeTakeFirst() : undefined;
    if (!business || !booking) return new Response(superjson.stringify({ error: "We could not find that booking." }), { status: 404 });

    if (booking.paymentStatus === "unpaid" && booking.paymentReference) {
      await refreshBookingPayment(booking, new URL(request.url).origin);
      booking = (await db.selectFrom("serviceBookings").selectAll().where("id", "=", booking.id).executeTakeFirstOrThrow());
    }
    const gateway = await db.selectFrom("paymentGateways").select("provider").where("businessId", "=", business.id).where("enabled", "=", true).executeTakeFirst();
    const due = Number.parseFloat(booking.amountDue);
    const output: OutputType = {
      code: booking.code,
      serviceName: booking.serviceName,
      businessName: business.name,
      businessSlug: business.slug,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      checkoutMode: booking.checkoutMode,
      amountDue: due,
      amountTotal: Number.parseFloat(booking.amountTotal),
      currency: booking.currency,
      preferredDate: booking.preferredDate,
      preferredTime: booking.preferredTime,
      createdAt: booking.createdAt,
      canPay: Boolean(gateway) && booking.paymentStatus === "unpaid" && booking.status !== "cancelled" && booking.checkoutMode !== "enquiry" && due > 0 && Boolean(booking.customerEmail),
    };
    return new Response(superjson.stringify(output), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(superjson.stringify({ error: error instanceof Error ? error.message : "Could not load the booking." }), { status: 400 });
  }
}
