import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import type { OutputType } from "./list_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
   10	
   11	    const [testimonials, portfolio] = await Promise.all([
   12	      db
   13	        .selectFrom("testimonials")
   14	        .selectAll()
   15	        .where("businessId", "=", business.id)
   16	        .orderBy("sortOrder", "asc")
   17	        .orderBy("createdAt", "asc")
   18	        .execute(),
   19	      db
   20	        .selectFrom("portfolioItems")
   21	        .selectAll()
   22	        .where("businessId", "=", business.id)
   23	        .orderBy("sortOrder", "asc")
   24	        .orderBy("createdAt", "asc")
   25	        .execute(),
   26	    ]);
   27	
   28	    return new Response(
   29	      superjson.stringify({
   30	        testimonials,
   31	        portfolio,
   32	        canEdit: subscriptionPlan.resolve(business).canEditPresence,
   33	      } satisfies OutputType),
   34	      { headers: { "Content-Type": "application/json" } },
   35	    );
   36	  } catch (error) {
   37	    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
   38	    return new Response(
   39	      superjson.stringify({
   40	        error: noBusiness ? "Create your business page first." : "Not authenticated",
   41	      }),
   42	      { status: noBusiness ? 400 : 401 },
   43	    );
   44	  }
   45	}
