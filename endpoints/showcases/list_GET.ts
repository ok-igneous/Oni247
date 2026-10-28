import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { OutputType } from "./list_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);

   10	    const rows = await db
   11	      .selectFrom("showcases")
   12	      .selectAll()
   13	      .where("businessId", "=", business.id)
   14	      .orderBy("createdAt", "desc")
   15	      .limit(100)
   16	      .execute();
   17	
   18	    const showcases = rows.map((row) => ({
   19	      id: row.id,
   20	      code: row.code,
   21	      title: row.title,
   22	      description: row.description,
   23	      productIds: (Array.isArray(row.productIds) ? row.productIds : []) as string[],
   24	      viewCount: row.viewCount,
   25	      createdAt: row.createdAt,
   26	    }));
   27	
   28	    return new Response(
   29	      superjson.stringify({ showcases } satisfies OutputType),
   30	      { headers: { "Content-Type": "application/json" } },
   31	    );
   32	  } catch (error) {
   33	    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
   34	    return new Response(
   35	      superjson.stringify({
   36	        error: noBusiness ? "Create your business page first." : "Not authenticated",
   37	      }),
   38	      { status: noBusiness ? 400 : 401 },
   39	    );
   40	  }
   41	}
