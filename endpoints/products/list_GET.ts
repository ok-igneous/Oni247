import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { OutputType } from "./list_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);

    const rows = await db
      .selectFrom("products")
      .select([
        "id",
        "categoryId",
        "name",
        "slug",
        "description",
        "price",
        "costPrice",
        "currency",
        "imageUrl",
        "available",
        "featured",
        "sortOrder",
        "unit",
        "variants",
        "stockQuantity",
        "images",
        "compareAtPrice",
      ])
      .where("businessId", "=", business.id)
      .orderBy("sortOrder", "asc")
      .orderBy("createdAt", "asc")
      .execute();

    const products = rows.map((row) => ({
      ...row,
      price: Number.parseFloat(row.price),
      costPrice: row.costPrice == null ? null : Number.parseFloat(row.costPrice),
      compareAtPrice:
        row.compareAtPrice == null ? null : Number.parseFloat(row.compareAtPrice),
      images: Array.isArray(row.images)
        ? row.images.filter((url): url is string => typeof url === "string")
        : [],
      variants: Array.isArray(row.variants)
        ? (row.variants as Array<{ name: string; value: string; price: number | null }>)
        : [],
    }));

    return new Response(
      superjson.stringify({ products } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
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
