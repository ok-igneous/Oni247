import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { OutputType } from "./overview_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);

   10	    const [products, categories, enquiries, orders] = await Promise.all([
   11	      db
   12	        .selectFrom("products")
   13	        .select(({ fn }) => fn.countAll<string>().as("count"))
   14	        .where("businessId", "=", business.id)
   15	        .executeTakeFirstOrThrow(),
   16	      db
   17	        .selectFrom("categories")
   18	        .select(({ fn }) => fn.countAll<string>().as("count"))
   19	        .where("businessId", "=", business.id)
   20	        .executeTakeFirstOrThrow(),
   21	      db
   22	        .selectFrom("enquiries")
   23	        .select(({ fn }) => fn.countAll<string>().as("count"))
   24	        .where("businessId", "=", business.id)
   25	        .where("status", "=", "new")
   26	        .executeTakeFirstOrThrow(),
   27	      db
   28	        .selectFrom("orders")
   29	        .select(({ fn }) => fn.countAll<string>().as("count"))
   30	        .where("businessId", "=", business.id)
   31	        .where("status", "=", "pending")
   32	        .executeTakeFirstOrThrow(),
   33	    ]);
   34	
   35	    const output: OutputType = {
   36	      hasBusiness: true,
   37	      businessName: business.name,
   38	      slug: business.slug,
   39	      status: business.status,
   40	      productCount: Number(products.count),
   41	      categoryCount: Number(categories.count),
   42	      newEnquiryCount: Number(enquiries.count),
   43	      pendingOrderCount: Number(orders.count),
   44	    };
   45	
   46	    return new Response(superjson.stringify(output satisfies OutputType), {
   47	      headers: { "Content-Type": "application/json" },
   48	    });
   49	  } catch (error) {
   50	    if (error instanceof Error && error.message === "NO_BUSINESS") {
   51	      return new Response(
   52	        superjson.stringify({ hasBusiness: false } satisfies OutputType),
   53	        { headers: { "Content-Type": "application/json" } },
   54	      );
   55	    }
   56	    return new Response(superjson.stringify({ error: "Not authenticated" }), {
   57	      status: 401,
   58	    });
   59	  }
   60	}
