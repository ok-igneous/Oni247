// floot:external
import superjson from "superjson";
import { db } from "../helpers/db";
import { requireOwnedBusiness } from "../helpers/requireOwnedBusiness";
import { schema } from "./traffic_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    const url = new URL(request.url);
    const input = schema.parse({ from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined });
    const now = new Date();
    const to = input.to ? new Date(input.to) : now;
    const from = input.from ? new Date(input.from) : new Date(now.getTime() - 30 * 86400000);
    const [enquiries, orders] = await Promise.all([
      db.selectFrom("enquiries").select("id").where("businessId", "=", business.id).where("createdAt", ">=", from).where("createdAt", "<=", to).execute(),
      db.selectFrom("orders").select(["id", "status"]).where("businessId", "=", business.id).where("createdAt", ">=", from).where("createdAt", "<=", to).execute(),
    ]);
    const completedOrders = orders.filter((order) => order.status === "completed").length;
    const conversionBase = enquiries.length + orders.length;
    return new Response(superjson.stringify({
      from: from.toISOString(), to: to.toISOString(), enquiries: enquiries.length, orders: orders.length,
      completedOrders, conversionRate: conversionBase ? (completedOrders / conversionBase) * 100 : null,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(superjson.stringify({ error: error instanceof Error ? error.message : "Could not load traffic data." }), { status: 400 });
  }
}
