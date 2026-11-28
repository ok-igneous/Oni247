import superjson from "superjson";
import { db } from "../../helpers/db";
import { generateTrackingCode } from "../../helpers/generateTrackingCode";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { schema, type OutputType } from "./create_POST.schema";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { adjustProductStock } from "../../helpers/adjustProductStock";
import { normalizeCustomerPhone } from "../../helpers/normalizeCustomerPhone";

/** A sale the owner records themselves — walk-in, phone, or a repeat customer. */
export async function handle(request: Request) {
  let businessId: string;
  let currency: string;
  let businessForPlan: Awaited<ReturnType<typeof requireOwnedBusiness>>["business"];
  try {
    const { business } = await requireOwnedBusiness(request);
    businessId = business.id;
    currency = business.currency;
    businessForPlan = business;
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  try {
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    const ids = [...new Set(input.items.map((item) => item.productId))];
    const products = await db
      .selectFrom("products")
      .select(["id", "name", "price", "costPrice"])
      .where("businessId", "=", businessId)
      .where("id", "in", ids)
      .execute();

    // Unlike the storefront, a direct sale may include out-of-stock items —
    // the owner is looking at the shelf. Prices still come from the database.
    const lines = input.items
      .map((item) => {
        const product = products.find((row) => row.id === item.productId);
        if (!product) return null;
        const unitPrice = Number.parseFloat(product.price);
        return {
          productId: product.id,
          name: product.name,
          quantity: item.quantity,
          unitPrice,
          unitCost: product.costPrice == null ? null : Number.parseFloat(product.costPrice),
          lineTotal: Number((unitPrice * item.quantity).toFixed(2)),
        };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);

    if (lines.length === 0) {
      return new Response(
        superjson.stringify({ error: "None of those items were found." }),
        { status: 400 },
      );
    }

    const total = Number(
      lines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2),
    );

    const phoneKey = input.customerPhone
      ? normalizeCustomerPhone(input.customerPhone)
      : "";

    const order = await db.transaction().execute(async (trx) => {
      // The owner is looking at the shelf, so a direct sale reduces stock but
      // never blocks on it.
      await adjustProductStock(
        trx,
        businessId,
        lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        "takeClamped",
      );

      let customerId: string | null = null;
      if (input.customerPhone && phoneKey.length >= 4) {
        const customer = await trx
          .insertInto("customers")
          .values({
            businessId,
            name: input.customerName,
            phone: input.customerPhone,
            phoneKey,
            lastAddress: input.deliveryAddress,
          })
          .onConflict((oc) =>
            oc.columns(["businessId", "phoneKey"]).doUpdateSet({
              name: input.customerName,
              phone: input.customerPhone as string,
              ...(input.deliveryAddress ? { lastAddress: input.deliveryAddress } : {}),
              updatedAt: new Date(),
            }),
          )
          .returning(["id"])
          .executeTakeFirstOrThrow();
        customerId = customer.id;
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const inserted = await trx
          .insertInto("orders")
          .values({
            businessId,
            customerId,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            deliveryAddress: input.deliveryAddress,
            items: lines,
            totalAmount: total.toFixed(2),
            currency,
            status: input.markCompleted ? "completed" : "pending",
            source: "direct",
            shippingStatus: input.deliveryAddress ? "preparing" : "not_required",
            stockReserved: true,
            trackingCode: generateTrackingCode(),
          })
          .onConflict((oc) => oc.column("trackingCode").doNothing())
          .returning(["id", "trackingCode"])
          .executeTakeFirst();
        if (inserted) return inserted;
      }
      return undefined;
    });

    if (!order) {
      return new Response(
        superjson.stringify({ error: "Could not record the sale." }),
        { status: 500 },
      );
    }

    return new Response(
      superjson.stringify({
        orderId: order.id,
        trackingCode: subscriptionPlan.resolve(businessForPlan).canUseTrackingLinks ? order.trackingCode : null,
        total,
        currency,
      } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[oni247] Direct order creation failed", error);
    return new Response(superjson.stringify({ error: "Could not record the sale. Please try again." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
