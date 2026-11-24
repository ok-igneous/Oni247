import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { adjustProductStock } from "../../helpers/adjustProductStock";
import { schema, type OutputType } from "./update_POST.schema";

type StoredLine = { productId?: unknown; quantity?: unknown };

const NOT_FOUND = "ORDER_NOT_FOUND";

export async function handle(request: Request) {
  let businessId: string;
  try {
    const { business } = await requireOwnedBusiness(request);
    businessId = business.id;
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  try {
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    await db.transaction().execute(async (trx) => {
      const current = await trx
        .selectFrom("orders")
        .select(["id", "status", "items", "stockReserved"])
        .where("id", "=", input.id)
        .where("businessId", "=", businessId)
        .forUpdate()
        .executeTakeFirst();

      if (!current) throw new Error(NOT_FOUND);

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (input.status !== undefined) patch.status = input.status;
      if (input.shippingStatus !== undefined)
        patch.shippingStatus = input.shippingStatus;
      if (input.paymentStatus !== undefined)
        patch.paymentStatus = input.paymentStatus;
      if (input.ownerNote !== undefined) patch.ownerNote = input.ownerNote;
      if (input.deliveryAddress !== undefined)
        patch.deliveryAddress = input.deliveryAddress;

      // Cancelling puts the stock back exactly once; reactivating takes it again.
      if (input.status !== undefined && input.status !== current.status) {
        const lines = (Array.isArray(current.items) ? current.items : [])
          .map((line) => line as StoredLine)
          .filter(
            (line): line is { productId: string; quantity: number } =>
              typeof line.productId === "string" && typeof line.quantity === "number",
          );

        if (
          input.status === "cancelled" &&
          current.status !== "cancelled" &&
          current.stockReserved
        ) {
          await adjustProductStock(trx, businessId, lines, "give");
          patch.stockReserved = false;
        } else if (
          current.status === "cancelled" &&
          input.status !== "cancelled" &&
          !current.stockReserved
        ) {
          await adjustProductStock(trx, businessId, lines, "takeClamped");
          patch.stockReserved = true;
        }
      }

      await trx
        .updateTable("orders")
        .set(patch)
        .where("id", "=", input.id)
        .where("businessId", "=", businessId)
        .execute();
    });

    return new Response(
      superjson.stringify({ updated: true } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    if (error instanceof Error && error.message === NOT_FOUND) {
      return new Response(superjson.stringify({ error: "Order not found." }), {
        status: 404,
      });
    }
    const message =
      error instanceof Error ? error.message : "Could not update the order.";
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}

