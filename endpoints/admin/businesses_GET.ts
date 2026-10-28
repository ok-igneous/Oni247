import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireAdmin } from "../../helpers/requireAdmin";
import type { OutputType } from "./businesses_GET.schema";

export async function handle(request: Request) {
  try {
    await requireAdmin(request);

   10	    const rows = await db
   11	      .selectFrom("businesses")
   12	      .innerJoin("users", "users.id", "businesses.ownerId")
   13	      .select(({ selectFrom }) => [
   14	        "businesses.id",
   15	        "businesses.name",
   16	        "businesses.slug",
   17	        "businesses.status",
   18	        "businesses.plan",
   19	        "businesses.planRenewsAt",
   20	        "businesses.trialEndsAt",
   21	        "businesses.isDemo",
   22	        "businesses.createdAt",
   23	        "users.email as ownerEmail",
   24	        "users.displayName as ownerName",
   25	        selectFrom("products")
   26	          .select(({ fn }) => fn.countAll<string>().as("count"))
   27	          .whereRef("products.businessId", "=", "businesses.id")
   28	          .as("productCount"),
   29	        selectFrom("orders")
   30	          .select(({ fn }) => fn.countAll<string>().as("count"))
   31	          .whereRef("orders.businessId", "=", "businesses.id")
   32	          .as("orderCount"),
   33	      ])
   34	      .orderBy("businesses.createdAt", "desc")
   35	      .limit(500)
   36	      .execute();
   37	
   38	    const businesses = rows.map((row) => ({
   39	      id: row.id,
   40	      name: row.name,
   41	      slug: row.slug,
   42	      status: row.status,
   43	      plan: row.plan,
   44	      planRenewsAt: row.planRenewsAt,
   45	      trialEndsAt: row.trialEndsAt,
   46	      isDemo: row.isDemo,
   47	      createdAt: row.createdAt,
   48	      ownerEmail: row.ownerEmail,
   49	      ownerName: row.ownerName,
   50	      productCount: Number(row.productCount ?? 0),
   51	      orderCount: Number(row.orderCount ?? 0),
   52	    }));
   53	
   54	    return new Response(
   55	      superjson.stringify({ businesses } satisfies OutputType),
   56	      { headers: { "Content-Type": "application/json" } },
   57	    );
   58	  } catch (error) {
   59	    const notAdmin = error instanceof Error && error.message === "NOT_ADMIN";
   60	    return new Response(
   61	      superjson.stringify({
   62	        error: notAdmin ? "Administrator access required." : "Not authenticated",
   63	      }),
   64	      { status: notAdmin ? 403 : 401 },
   65	    );
   66	  }
   67	}
