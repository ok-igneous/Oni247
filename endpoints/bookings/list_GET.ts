import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { OutputType } from "./list_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    const rows = await db.selectFrom("serviceBookings").selectAll().where("businessId", "=", business.id).orderBy("createdAt", "desc").limit(300).execute();
    const bookings = rows.map((r) => ({
      id: r.id,
      code: r.code,
      serviceName: r.serviceName,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      customerEmail: r.customerEmail,
      preferredDate: r.preferredDate,
      preferredTime: r.preferredTime,
      location: r.location,
      notes: r.notes,
      currency: r.currency,
      amountTotal: Number.parseFloat(r.amountTotal),
      amountDue: Number.parseFloat(r.amountDue),
      checkoutMode: r.checkoutMode,
      status: r.status,
      paymentStatus: r.paymentStatus,
      paymentProvider: r.paymentProvider,
      ownerNote: r.ownerNote,
      paidAt: r.paidAt,
      createdAt: r.createdAt,
    }));
    const paidTotal = rows.filter((r) => r.paymentStatus === "paid").reduce((sum, r) => sum + Number.parseFloat(r.amountDue), 0);
    return new Response(superjson.stringify({ bookings, paidTotal, currency: business.currency } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
    return new Response(superjson.stringify({ error: noBusiness ? "Create your business page first." : "Not authenticated" }), { status: noBusiness ? 400 : 401 });
  }
}
