import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireAdmin } from "../../helpers/requireAdmin";
import type { OutputType } from "./businesses_GET.schema";

export async function handle(request: Request) {
  try {
    await requireAdmin(request);

    const rows = await db
      .selectFrom("businesses")
      .innerJoin("users", "users.id", "businesses.ownerId")
      .select(({ selectFrom }) => [
        "businesses.id",
        "businesses.name",
        "businesses.slug",
        "businesses.status",
        "businesses.plan",
        "businesses.planRenewsAt",
        "businesses.trialEndsAt",
        "businesses.isDemo",
        "businesses.createdAt",
        "users.email as ownerEmail",
        "users.displayName as ownerName",
        selectFrom("products")
          .select(({ fn }) => fn.countAll<string>().as("count"))
          .whereRef("products.businessId", "=", "businesses.id")
          .as("productCount"),
        selectFrom("orders")
          .select(({ fn }) => fn.countAll<string>().as("count"))
          .whereRef("orders.businessId", "=", "businesses.id")
          .as("orderCount"),
      ])
      .orderBy("businesses.createdAt", "desc")
      .limit(500)
      .execute();

    const businesses = rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      plan: row.plan,
      planRenewsAt: row.planRenewsAt,
      trialEndsAt: row.trialEndsAt,
      isDemo: row.isDemo,
      createdAt: row.createdAt,
      ownerEmail: row.ownerEmail,
      ownerName: row.ownerName,
      productCount: Number(row.productCount ?? 0),
      orderCount: Number(row.orderCount ?? 0),
    }));

    return new Response(
      superjson.stringify({ businesses } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const notAdmin = error instanceof Error && error.message === "NOT_ADMIN";
    return new Response(
      superjson.stringify({
        error: notAdmin ? "Administrator access required." : "Not authenticated",
      }),
      { status: notAdmin ? 403 : 401 },
    );
  }
}
