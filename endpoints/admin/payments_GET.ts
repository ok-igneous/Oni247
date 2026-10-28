import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireAdmin } from "../../helpers/requireAdmin";
import type { OutputType } from "./payments_GET.schema";

export async function handle(request: Request) {
  try {
    await requireAdmin(request);

   10	    const rows = await db
   11	      .selectFrom("subscriptionPayments")
   12	      .innerJoin("businesses", "businesses.id", "subscriptionPayments.businessId")
   13	      .select([
   14	        "subscriptionPayments.id",
   15	        "subscriptionPayments.txRef",
   16	        "subscriptionPayments.amount",
   17	        "subscriptionPayments.currency",
   18	        "subscriptionPayments.status",
   19	        "subscriptionPayments.periodEnd",
   20	        "subscriptionPayments.createdAt",
   21	        "businesses.name as businessName",
   22	        "businesses.slug as businessSlug",
   23	      ])
   24	      .orderBy("subscriptionPayments.createdAt", "desc")
   25	      .limit(200)
   26	      .execute();
   27	
   28	    const payments = rows.map((row) => ({
   29	      id: row.id,
   30	      businessName: row.businessName,
   31	      businessSlug: row.businessSlug,
   32	      txRef: row.txRef,
   33	      amount: Number.parseFloat(row.amount),
   34	      currency: row.currency,
   35	      status: row.status,
   36	      periodEnd: row.periodEnd,
   37	      createdAt: row.createdAt,
   38	    }));
   39	
   40	    return new Response(
   41	      superjson.stringify({ payments } satisfies OutputType),
   42	      { headers: { "Content-Type": "application/json" } },
   43	    );
   44	  } catch (error) {
   45	    const notAdmin = error instanceof Error && error.message === "NOT_ADMIN";
   46	    return new Response(
   47	      superjson.stringify({
   48	        error: notAdmin ? "Administrator access required." : "Not authenticated",
   49	      }),
   50	      { status: notAdmin ? 403 : 401 },
   51	    );
   52	  }
   53	}
