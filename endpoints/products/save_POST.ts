import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { toSlug } from "../../helpers/toSlug";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { schema, type OutputType } from "./save_POST.schema";

/** Unique within one business; never collides across businesses. */
const uniqueSlug = async (
  businessId: string,
  name: string,
  currentId: string | null,
): Promise<string> => {
  const base = toSlug(name) || "item";
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    let query = db
      .selectFrom("products")
      .select(["id"])
      .where("businessId", "=", businessId)
      .where("slug", "=", candidate);
    if (currentId) {
      query = query.where("id", "!=", currentId);
    }
    const taken = await query.limit(1).executeTakeFirst();
    if (!taken) return candidate;
  }
  return `${base}-${Date.now()}`;
};

export async function handle(request: Request) {
  let businessId: string;
  let currency: string;
  let planLimit: number | null;
  try {
    const { business } = await requireOwnedBusiness(request);
    businessId = business.id;
    currency = business.currency;
    planLimit = subscriptionPlan.resolve(business).productLimit;
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  try {
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    // Only creating a product is limited — editing what you already have is
    // always allowed, so a lapsed plan never locks you out of your own data.
    if (!input.id && planLimit !== null) {
      const existing = await db
        .selectFrom("products")
        .select(({ fn }) => fn.countAll<string>().as("count"))
        .where("businessId", "=", businessId)
        .executeTakeFirstOrThrow();

      if (Number(existing.count) >= planLimit) {
        return new Response(
          superjson.stringify({
            error: `The free plan covers ${planLimit} products. Upgrade to list more.`,
          }),
          { status: 402 },
        );
      }
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      const attempts = await db
        .selectFrom("productCreationAttempts")
        .select(({ fn }) => fn.countAll<string>().as("count"))
        .where("businessId", "=", businessId)
        .where("createdAt", ">=", dayStart)
        .executeTakeFirstOrThrow();
      if (Number(attempts.count) >= subscriptionPlan.freeDailyCreationLimit) {
        return new Response(
          superjson.stringify({ error: "Free plan allows 2 product/service creations per day." }),
          { status: 402 },
        );
      }
    }

    // A category id from the client is only accepted if it belongs to THIS
    // business — otherwise a shop could file its products under another's.
    if (input.categoryId) {
      const owned = await db
        .selectFrom("categories")
        .select(["id"])
        .where("id", "=", input.categoryId)
        .where("businessId", "=", businessId)
        .limit(1)
        .executeTakeFirst();
      if (!owned) {
        return new Response(
          superjson.stringify({ error: "That category does not exist." }),
          { status: 400 },
        );
      }
    }

    const slug = await uniqueSlug(businessId, input.name, input.id ?? null);

    const values = {
      categoryId: input.categoryId ?? null,
      name: input.name,
      slug,
      description: input.description,
      price: input.price.toFixed(2),
      costPrice: input.costPrice == null ? null : input.costPrice.toFixed(2),
      currency,
      imageUrl: input.imageUrl,
      available: input.available,
      featured: input.featured,
      sortOrder: input.sortOrder,
      unit: input.unit ?? null,
      variants: input.variants ?? [],
      ...(input.stockQuantity !== undefined
        ? { stockQuantity: input.stockQuantity }
        : {}),
      ...(input.images !== undefined ? { images: input.images } : {}),
      ...(input.compareAtPrice !== undefined
        ? {
            compareAtPrice:
              input.compareAtPrice === null ? null : input.compareAtPrice.toFixed(2),
          }
        : {}),
    };

    const row = input.id
      ? await db
          .updateTable("products")
          .set({ ...values, updatedAt: new Date() })
          .where("id", "=", input.id)
          .where("businessId", "=", businessId)
          .returningAll()
          .executeTakeFirst()
      : await db
          .insertInto("products")
          .values({ ...values, businessId })
          .returningAll()
          .executeTakeFirstOrThrow();

    if (!input.id && planLimit !== null) {
      await db.insertInto("productCreationAttempts").values({ businessId }).execute();
    }

    if (!row) {
      return new Response(superjson.stringify({ error: "Product not found." }), {
        status: 404,
      });
    }

    const output: OutputType = {
      product: {
        id: row.id,
        categoryId: row.categoryId,
        name: row.name,
        slug: row.slug,
        description: row.description,
        price: Number.parseFloat(row.price),
        costPrice: row.costPrice == null ? null : Number.parseFloat(row.costPrice),
        currency: row.currency,
        imageUrl: row.imageUrl,
        available: row.available,
        featured: row.featured,
        sortOrder: row.sortOrder,
        unit: row.unit,
        variants: Array.isArray(row.variants)
          ? (row.variants as Array<{ name: string; value: string; price: number | null }>)
          : [],
        stockQuantity: row.stockQuantity,
        images: Array.isArray(row.images)
          ? row.images.filter((url): url is string => typeof url === "string")
          : [],
        compareAtPrice:
          row.compareAtPrice == null ? null : Number.parseFloat(row.compareAtPrice),
      },
    };

    return new Response(superjson.stringify(output satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save the product.";
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}
