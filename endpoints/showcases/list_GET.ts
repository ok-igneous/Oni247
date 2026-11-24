import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { OutputType } from "./list_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);

    const rows = await db
      .selectFrom("showcases")
      .selectAll()
      .where("businessId", "=", business.id)
      .orderBy("createdAt", "desc")
      .limit(100)
      .execute();

    const showcases = rows.map((row) => ({
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description,
      productIds: (Array.isArray(row.productIds) ? row.productIds : []) as string[],
      viewCount: row.viewCount,
      createdAt: row.createdAt,
    }));

    return new Response(
      superjson.stringify({ showcases } satisfies OutputType),
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
