import superjson from "superjson";
import { db } from "../../helpers/db";
import { refreshOrderPayment } from "../../helpers/orderPayments";
import { startOrderPayment } from "../../helpers/startOrderPayment";
import { schema, type OutputType } from "./orderPay_POST.schema";

const fail = (error: string, status: number) => new Response(superjson.stringify({ error }), { status });

/** Public: lets a customer finish or verify an online payment for their own order, found by shop and order reference. */
export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const business = await db.selectFrom("businesses").select(["id", "name", "slug"]).where("slug", "=", input.slug).where("status", "=", "published").executeTakeFirst();
    const order = business
      ? await db
          .selectFrom("orders")
          .leftJoin("customers", "customers.id", "orders.customerId")
          .select([
            "orders.id",
            "orders.businessId",
            "orders.trackingCode",
            "orders.totalAmount",
            "orders.currency",
            "orders.customerName",
            "orders.customerPhone",
            "orders.status",
            "orders.paymentMethod",
            "orders.paymentStatus",
            "orders.paymentProvider",
            "orders.paymentReference",
            "orders.providerRef",
            "customers.email as customerEmail",
          ])
          .where("orders.businessId", "=", business.id)
          .where("orders.trackingCode", "=", input.ref.toUpperCase())
          .executeTakeFirst()
      : undefined;
    if (!business || !order || order.paymentMethod !== "online") return fail("We could not find that order.", 404);

    const respond = (paymentStatus: OutputType["paymentStatus"], paymentUrl: string | null) =>
      new Response(
        superjson.stringify({ orderRef: order.trackingCode, paymentStatus, paymentUrl, total: Number.parseFloat(order.totalAmount), currency: order.currency, businessName: business.name } satisfies OutputType),
        { headers: { "Content-Type": "application/json" } },
      );

    if (order.paymentStatus === "paid") return respond("paid", null);

    // If an earlier attempt actually went through, settle it instead of charging twice.
    if (order.paymentReference) {
      const checked = await refreshOrderPayment(order);
      if (checked === "paid") return respond("paid", null);
      if (input.op === "check") return respond(checked === "failed" ? "failed" : "unpaid", null);
    } else if (input.op === "check") {
      return respond("unpaid", null);
    }

    if (order.status === "cancelled") return fail("This order was cancelled.", 400);
    const started = await startOrderPayment(order, business, new URL(request.url).origin);
    if (!started.ok) return fail(started.error, 502);
    return respond("unpaid", started.url);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not start the payment.", 400);
  }
}

