import superjson from "superjson";
import { db } from "../helpers/db";
import { requireOwnedBusiness } from "../helpers/requireOwnedBusiness";
import { schema } from "./traffic_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    const url = new URL(request.url);
   10	    const input = schema.parse({ from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined });
   11	    const now = new Date();
   12	    const to = input.to ? new Date(input.to) : now;
   13	    const from = input.from ? new Date(input.from) : new Date(now.getTime() - 30 * 86400000);
   14	    const [enquiries, orders] = await Promise.all([
   15	      db.selectFrom("enquiries").select("id").where("businessId", "=", business.id).where("createdAt", ">=", from).where("createdAt", "<=", to).execute(),
   16	      db.selectFrom("orders").select(["id", "status"]).where("businessId", "=", business.id).where("createdAt", ">=", from).where("createdAt", "<=", to).execute(),
   17	    ]);
   18	    const completedOrders = orders.filter((order) => order.status === "completed").length;
   19	    const conversionBase = enquiries.length + orders.length;
   20	    return new Response(superjson.stringify({
   21	      from: from.toISOString(), to: to.toISOString(), enquiries: enquiries.length, orders: orders.length,
   22	      completedOrders, conversionRate: conversionBase ? (completedOrders / conversionBase) * 100 : null,
   23	    }), { headers: { "Content-Type": "application/json" } });
   24	  } catch (error) {
   25	    return new Response(superjson.stringify({ error: error instanceof Error ? error.message : "Could not load traffic data." }), { status: 400 });
   26	  }
   27	}
