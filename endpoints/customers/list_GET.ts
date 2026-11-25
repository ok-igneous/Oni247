import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type {
  CustomerOrderSummary,
  OutputType,
} from "./list_GET.schema";

const MAX_CUSTOMERS = 500;
const RECENT_PER_CUSTOMER = 5;

type StoredLine = { name?: unknown; quantity?: unknown };

const summarise = (items: unknown): string => {
  const lines = (Array.isArray(items) ? items : []) as StoredLine[];
  const parts = lines
    .filter((line) => typeof line.name === "string")
    .map((line) => `${typeof line.quantity === "number" ? line.quantity : 1} × ${line.name as string}`);
  if (parts.length <= 2) return parts.join(", ");
  return `${parts.slice(0, 2).join(", ")} +${parts.length - 2} more`;
};

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);

    const rows = await db
      .selectFrom("customers as c")
      .leftJoin("orders as o", "o.customerId", "c.id")
      .select([
        "c.id",
        "c.name",
        "c.phone",
        "c.email",
        "c.lastAddress",
        "c.notes",
        "c.createdAt",
      ])
      .select(
        sql<string>`count(o.id) filter (where o.status <> 'cancelled')`.as("orderCount"),
      )
      .select(
        sql<string>`coalesce(sum(o.total_amount) filter (where o.status <> 'cancelled'), 0)`.as(
          "totalSpent",
        ),
      )
      .select(sql<Date | null>`max(o.created_at)`.as("lastOrderAt"))
      .where("c.businessId", "=", business.id)
      .groupBy("c.id")
      .orderBy(sql`max(o.created_at) desc nulls last`)
      .limit(MAX_CUSTOMERS)
      .execute();

    const ids = rows.map((row) => row.id);
    const byCustomer = new Map<string, CustomerOrderSummary[]>();

    if (ids.length > 0) {
      const orders = await db
        .selectFrom("orders")
        .select([
          "id",
          "customerId",
          "trackingCode",
          "totalAmount",
          "currency",
          "status",
          "createdAt",
          "items",
        ])
        .where("businessId", "=", business.id)
        .where("customerId", "in", ids)
        .orderBy("createdAt", "desc")
        .limit(2000)
        .execute();

      for (const order of orders) {
        if (!order.customerId) continue;
        const list = byCustomer.get(order.customerId) ?? [];
        if (list.length >= RECENT_PER_CUSTOMER) continue;
        list.push({
          id: order.id,
          trackingCode: order.trackingCode,
          totalAmount: Number.parseFloat(order.totalAmount),
          currency: order.currency,
          status: order.status,
          createdAt: order.createdAt,
          itemSummary: summarise(order.items),
        });
        byCustomer.set(order.customerId, list);
      }
    }

    const customers = rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      lastAddress: row.lastAddress,
      notes: row.notes,
      createdAt: row.createdAt,
      orderCount: Number(row.orderCount),
      totalSpent: Number.parseFloat(row.totalSpent),
      lastOrderAt: row.lastOrderAt,
      recentOrders: byCustomer.get(row.id) ?? [],
    }));

    return new Response(superjson.stringify({ customers } satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
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
