import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { schema, type OutputType } from "./delete_POST.schema";

export async function handle(request: Request) {
  let businessId: string;
  try {
    const { business } = await requireOwnedBusiness(request);
   10	    businessId = business.id;
   11	  } catch {
   12	    return new Response(superjson.stringify({ error: "Not authenticated" }), {
   13	      status: 401,
   14	    });
   15	  }
   16	
   17	  try {
   18	    const json = superjson.parse(await request.text());
   19	    const input = schema.parse(json);
   20	
   21	    // Deleting is allowed on any plan — a lapsed shop must still be able to
   22	    // take down content it no longer wants shown.
   23	    const result =
   24	      input.kind === "testimonial"
   25	        ? await db
   26	            .deleteFrom("testimonials")
   27	            .where("id", "=", input.id)
   28	            .where("businessId", "=", businessId)
   29	            .executeTakeFirst()
   30	        : await db
   31	            .deleteFrom("portfolioItems")
   32	            .where("id", "=", input.id)
   33	            .where("businessId", "=", businessId)
   34	            .executeTakeFirst();
   35	
   36	    if (Number(result.numDeletedRows ?? 0) === 0) {
   37	      return new Response(superjson.stringify({ error: "Not found." }), {
   38	        status: 404,
   39	      });
   40	    }
   41	
   42	    return new Response(
   43	      superjson.stringify({ deleted: true } satisfies OutputType),
   44	      { headers: { "Content-Type": "application/json" } },
   45	    );
   46	  } catch (error) {
   47	    const message = error instanceof Error ? error.message : "Could not delete.";
   48	    return new Response(superjson.stringify({ error: message }), {
   49	      status: 400,
   50	    });
   51	  }
   52	}
