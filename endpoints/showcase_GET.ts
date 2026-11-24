import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../helpers/db";
import { schema, type OutputType } from "./showcase_GET.schema";
import { subscriptionPlan } from "../helpers/subscriptionPlan";

export async function handle(request: Request) {
  try {
    const url = new URL(request.url);
    const input = schema.parse({ code: url.searchParams.get("code") ?? "" });

    const showcase = await db
      .selectFrom("showcases")
      .innerJoin("businesses", "businesses.id", "showcases.businessId")
      .select([
        "showcases.id",
        "showcases.code",
        "showcases.title",
        "showcases.description",
        "showcases.productIds",
        "businesses.id as businessId",
        "businesses.name as businessName",
        "businesses.slug as businessSlug",
        "businesses.logoUrl as businessLogo",
        "businesses.phone as businessPhone",
        "businesses.whatsappNumber as businessWhatsapp",
        "businesses.currency as businessCurrency",
        "businesses.plan as businessPlan",
        "businesses.trialEndsAt as trialEndsAt",
        "businesses.planRenewsAt as planRenewsAt",
      ])
      .where("showcases.code", "=", input.code)
      // A collection from an unpublished or suspended shop stays private.
      .where("businesses.status", "=", "published")
      .limit(1)
      .executeTakeFirst();

    if (!showcase) {
      return new Response(
        superjson.stringify({ error: "This collection was not found." }),
        { status: 404 },
      );
    }
    if (!subscriptionPlan.resolve({
      plan: showcase.businessPlan,
      trialEndsAt: showcase.trialEndsAt,
      planRenewsAt: showcase.planRenewsAt,
    }).canCreateCollection) {
      return new Response(superjson.stringify({ error: "This collection is available on Premium." }), { status: 404 });
    }

    const ids = (Array.isArray(showcase.productIds)
      ? showcase.productIds
      : []) as string[];

    const rows =
      ids.length > 0
        ? await db
            .selectFrom("products")
            .select([
              "id",
              "categoryId",
              "name",
              "slug",
              "description",
              "price",
              "currency",
              "imageUrl",
              "available",
              "featured",
            ])
            .where("businessId", "=", showcase.businessId)
            .where("id", "in", ids)
            .execute()
        : [];

    // Keep the order the shop chose, not the database's.
    const products = ids
      .map((id) => rows.find((row) => row.id === id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((row) => ({ ...row, price: Number.parseFloat(row.price) }));

    void db
      .updateTable("showcases")
      .set({ viewCount: sql`view_count + 1` })
      .where("id", "=", showcase.id)
      .execute()
      .catch(() => {
        /* a view counter must never break the page */
      });

    const output: OutputType = {
      showcase: {
        title: showcase.title,
        description: showcase.description,
        code: showcase.code,
      },
      business: {
        name: showcase.businessName,
        slug: showcase.businessSlug,
        logoUrl: showcase.businessLogo,
        phone: showcase.businessPhone,
        whatsappNumber: showcase.businessWhatsapp,
        currency: showcase.businessCurrency,
      },
      products,
    };

    return new Response(superjson.stringify(output satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load this collection.";
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}
