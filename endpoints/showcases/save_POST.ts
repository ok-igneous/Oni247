import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { generateTrackingCode } from "../../helpers/generateTrackingCode";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { schema, type OutputType } from "./save_POST.schema";

export async function handle(request: Request) {
  let businessId: string;
  try {
    const { business } = await requireOwnedBusiness(request);
    businessId = business.id;
    if (!subscriptionPlan.resolve(business).canCreateCollection) {
      return new Response(
        superjson.stringify({ error: "Collections are available on Premium." }),
        { status: 402 },
      );
    }
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  try {
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    // Only this shop's own products may go in a collection.
    const owned = await db
      .selectFrom("products")
      .select(["id"])
      .where("businessId", "=", businessId)
      .where("id", "in", input.productIds)
      .execute();

    const ownedIds = new Set(owned.map((row) => row.id));
    const productIds = input.productIds.filter((id) => ownedIds.has(id));

    if (productIds.length === 0) {
      return new Response(
        superjson.stringify({ error: "None of those products were found." }),
        { status: 400 },
      );
    }

    const values = {
      title: input.title,
      description: input.description,
      productIds,
    };

    let row;
    if (input.id) {
      row = await db
        .updateTable("showcases")
        .set({ ...values, updatedAt: new Date() })
        .where("id", "=", input.id)
        .where("businessId", "=", businessId)
        .returningAll()
        .executeTakeFirst();
    } else {
      for (let attempt = 0; attempt < 5 && !row; attempt += 1) {
        try {
          row = await db
            .insertInto("showcases")
            .values({ ...values, businessId, code: generateTrackingCode() })
            .returningAll()
            .executeTakeFirstOrThrow();
        } catch (insertError) {
          const message = insertError instanceof Error ? insertError.message : "";
          if (!message.includes("showcases_code_key")) throw insertError;
        }
      }
    }

    if (!row) {
      return new Response(
        superjson.stringify({ error: "Collection not found." }),
        { status: 404 },
      );
    }

    const output: OutputType = {
      showcase: {
        id: row.id,
        code: row.code,
        title: row.title,
        description: row.description,
        productIds: (Array.isArray(row.productIds) ? row.productIds : []) as string[],
        viewCount: row.viewCount,
        createdAt: row.createdAt,
      },
    };

    return new Response(superjson.stringify(output satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save the collection.";
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}
