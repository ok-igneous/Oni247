import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { OutputType } from "./list_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);

   10	    const enquiries = await db
   11	      .selectFrom("enquiries")
   12	      .selectAll()
   13	      .where("businessId", "=", business.id)
   14	      .orderBy("createdAt", "desc")
   15	      .limit(200)
   16	      .execute();
   17	
   18	    return new Response(
   19	      superjson.stringify({ enquiries } satisfies OutputType),
   20	      { headers: { "Content-Type": "application/json" } },
   21	    );
   22	  } catch (error) {
   23	    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
   24	    return new Response(
   25	      superjson.stringify({
   26	        error: noBusiness ? "Create your business page first." : "Not authenticated",
   27	      }),
   28	      { status: noBusiness ? 400 : 401 },
   29	    );
   30	  }
   31	}
