import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { OrderLine, OutputType } from "./list_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);

    const rows = await db
      .selectFrom("orders")
      .selectAll()
      .where("businessId", "=", business.id)
      .orderBy("createdAt", "desc")
      .limit(200)
      .execute();

    const orders = rows.map((row) => ({
      id: row.id,
      trackingCode: row.trackingCode,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      items: (Array.isArray(row.items) ? row.items : []) as OrderLine[],
      totalAmount: Number.parseFloat(row.totalAmount),
      currency: row.currency,
      status: row.status,
      shippingStatus: row.shippingStatus,
      source: row.source,
      deliveryAddress: row.deliveryAddress,
      ownerNote: row.ownerNote,
      createdAt: row.createdAt,
      deliveryFee: Number.parseFloat(row.deliveryFee),
      deliveryZone: row.deliveryZone,
      paymentMethod: row.paymentMethod,
      paymentStatus: row.paymentStatus,
      customerNote: row.customerNote,
      customerId: row.customerId,
    }));

    return new Response(superjson.stringify({ orders } satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
    return new Response(
      superjson.stringify({
        error: noBusiness ? "Create your business page first." : "Not authenticated",
      }),
      { status: noBusiness ? 400 : 401 },
    );
  }
}
