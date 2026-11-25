import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { adjustProductStock } from "../../helpers/adjustProductStock";
import { schema, type OutputType } from "./delete_POST.schema";

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

    const deleted = await db.transaction().execute(async (trx) => {
      const current = await trx
        .selectFrom("orders")
        .select(["id", "items", "stockReserved"])
        .where("id", "=", input.id)
        .where("businessId", "=", businessId)
        .forUpdate()
        .executeTakeFirst();
      if (!current) return false;

      // An order that still holds stock gives it back when it is removed.
      if (current.stockReserved) {
        const lines = (Array.isArray(current.items) ? current.items : [])
          .map((line) => line as { productId?: unknown; quantity?: unknown })
          .filter(
            (line): line is { productId: string; quantity: number } =>
              typeof line.productId === "string" && typeof line.quantity === "number",
          );
        await adjustProductStock(trx, businessId, lines, "give");
      }

      await trx
        .deleteFrom("orders")
        .where("id", "=", input.id)
        .where("businessId", "=", businessId)
        .execute();
      return true;
    });

    if (!deleted) {
      return new Response(superjson.stringify({ error: "Order not found." }), {
        status: 404,
      });
    }

    return new Response(
      superjson.stringify({ deleted: true } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete the order.";
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}
