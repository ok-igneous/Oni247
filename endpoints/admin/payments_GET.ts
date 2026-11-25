import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireAdmin } from "../../helpers/requireAdmin";
import type { OutputType } from "./payments_GET.schema";

export async function handle(request: Request) {
  try {
    await requireAdmin(request);

    const rows = await db
      .selectFrom("subscriptionPayments")
      .innerJoin("businesses", "businesses.id", "subscriptionPayments.businessId")
      .select([
        "subscriptionPayments.id",
        "subscriptionPayments.txRef",
        "subscriptionPayments.amount",
        "subscriptionPayments.currency",
        "subscriptionPayments.status",
        "subscriptionPayments.periodEnd",
        "subscriptionPayments.createdAt",
        "businesses.name as businessName",
        "businesses.slug as businessSlug",
      ])
      .orderBy("subscriptionPayments.createdAt", "desc")
      .limit(200)
      .execute();

    const payments = rows.map((row) => ({
      id: row.id,
      businessName: row.businessName,
      businessSlug: row.businessSlug,
      txRef: row.txRef,
      amount: Number.parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      periodEnd: row.periodEnd,
      createdAt: row.createdAt,
    }));

    return new Response(
      superjson.stringify({ payments } satisfies OutputType),
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
