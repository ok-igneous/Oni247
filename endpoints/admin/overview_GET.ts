import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireAdmin } from "../../helpers/requireAdmin";
import type { OutputType } from "./overview_GET.schema";

export async function handle(request: Request) {
  try {
    await requireAdmin(request);

   10	    const now = new Date();
   11	
   12	    const [businesses, owners, products, orders, revenue] = await Promise.all([
   13	      db
   14	        .selectFrom("businesses")
   15	        .select(({ fn, eb }) => [
   16	          fn.countAll<string>().as("total"),
   17	          fn
   18	            .count<string>(eb.case().when("status", "=", "published").then(1).end())
   19	            .as("published"),
   20	          fn
   21	            .count<string>(eb.case().when("status", "=", "suspended").then(1).end())
   22	            .as("suspended"),
   23	          fn
   24	            .count<string>(
   25	              eb
   26	                .case()
   27	                .when(eb.and([eb("plan", "=", "premium"), eb("planRenewsAt", ">", now)]))
   28	                .then(1)
   29	                .end(),
   30	            )
   31	            .as("premiumActive"),
   32	          fn
   33	            .count<string>(
   34	              eb
   35	                .case()
   36	                .when(eb.and([eb("plan", "=", "premium"), eb("planRenewsAt", "<=", now)]))
   37	                .then(1)
   38	                .end(),
   39	            )
   40	            .as("lapsed"),
   41	          fn
   42	            .count<string>(eb.case().when("trialEndsAt", ">", now).then(1).end())
   43	            .as("trialing"),
   44	        ])
   45	        .executeTakeFirstOrThrow(),
   46	      db
   47	        .selectFrom("users")
   48	        .select(({ fn }) => fn.countAll<string>().as("total"))
   49	        .executeTakeFirstOrThrow(),
   50	      db
   51	        .selectFrom("products")
   52	        .select(({ fn }) => fn.countAll<string>().as("total"))
   53	        .executeTakeFirstOrThrow(),
   54	      db
   55	        .selectFrom("orders")
   56	        .select(({ fn }) => [
   57	          fn.countAll<string>().as("total"),
   58	          fn.sum<string>("totalAmount").as("value"),
   59	        ])
   60	        .executeTakeFirstOrThrow(),
   61	      db
   62	        .selectFrom("subscriptionPayments")
   63	        .select(({ fn }) => fn.sum<string>("amount").as("value"))
   64	        .where("status", "=", "successful")
   65	        .executeTakeFirstOrThrow(),
   66	    ]);
   67	
   68	    const output: OutputType = {
   69	      businessCount: Number(businesses.total),
   70	      publishedCount: Number(businesses.published),
   71	      suspendedCount: Number(businesses.suspended),
   72	      premiumActiveCount: Number(businesses.premiumActive),
   73	      lapsedCount: Number(businesses.lapsed),
   74	      trialCount: Number(businesses.trialing),
   75	      ownerCount: Number(owners.total),
   76	      productCount: Number(products.total),
   77	      orderCount: Number(orders.total),
   78	      orderValue: Number.parseFloat(orders.value ?? "0"),
   79	      subscriptionRevenue: Number.parseFloat(revenue.value ?? "0"),
   80	      currency: "NGN",
   81	    };
   82	
   83	    return new Response(superjson.stringify(output satisfies OutputType), {
   84	      headers: { "Content-Type": "application/json" },
   85	    });
   86	  } catch (error) {
   87	    const notAdmin = error instanceof Error && error.message === "NOT_ADMIN";
   88	    return new Response(
   89	      superjson.stringify({
   90	        error: notAdmin ? "Administrator access required." : "Not authenticated",
   91	      }),
   92	      { status: notAdmin ? 403 : 401 },
   93	    );
   94	  }
   95	}
