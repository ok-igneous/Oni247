import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { refreshBookingPayment } from "../../helpers/bookingPayments";
import { runEmailAutomation } from "../../helpers/runEmailAutomation";
import { schema, type OutputType } from "./update_POST.schema";

const fail = (error: string, status: number) => new Response(superjson.stringify({ error }), { status });

export async function handle(request: Request) {
  let businessId: string;
  try {
    businessId = (await requireOwnedBusiness(request)).business.id;
  } catch {
    return fail("Not authenticated", 401);
  }
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const booking = await db.selectFrom("serviceBookings").selectAll().where("id", "=", input.id).where("businessId", "=", businessId).executeTakeFirst();
    if (!booking) return fail("That booking no longer exists.", 404);
    const origin = new URL(request.url).origin;
    const ok = () => new Response(superjson.stringify({ ok: true } satisfies OutputType), { headers: { "Content-Type": "application/json" } });

    if (input.op === "delete") {
      await db.deleteFrom("serviceBookings").where("id", "=", booking.id).execute();
      return ok();
    }
    if (input.op === "refresh") {
      await refreshBookingPayment(booking, origin);
      return ok();
    }

    const set: { status?: string; paymentStatus?: string; ownerNote?: string | null; paidAt?: Date | null; updatedAt: Date } = { updatedAt: new Date() };
    if (input.ownerNote !== undefined) set.ownerNote = input.ownerNote || null;
    if (input.status) set.status = input.status;
    if (input.paymentStatus) {
      set.paymentStatus = input.paymentStatus;
      set.paidAt = input.paymentStatus === "paid" ? booking.paidAt ?? new Date() : null;
      if (input.paymentStatus === "paid" && booking.status === "requested" && !input.status) set.status = "confirmed";
    }
    await db.updateTable("serviceBookings").set(set).where("id", "=", booking.id).execute();

    const becameConfirmed = set.status === "confirmed" && booking.status !== "confirmed";
    if (becameConfirmed) {
      await runEmailAutomation(businessId, "booking_confirmed", { email: booking.customerEmail, name: booking.customerName }, { order: booking.code, service: booking.serviceName }, origin);
    }
    return ok();
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not update the booking.", 400);
  }
}
