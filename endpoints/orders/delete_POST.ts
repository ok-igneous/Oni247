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
   21	    const result = await db
   22	      .deleteFrom("orders")
   23	      .where("id", "=", input.id)
   24	      .where("businessId", "=", businessId)
   25	      .executeTakeFirst();
   26	
   27	    if (Number(result.numDeletedRows ?? 0) === 0) {
   28	      return new Response(superjson.stringify({ error: "Order not found." }), {
   29	        status: 404,
   30	      });
   31	    }
   32	
   33	    return new Response(
   34	      superjson.stringify({ deleted: true } satisfies OutputType),
   35	      { headers: { "Content-Type": "application/json" } },
   36	    );
   37	  } catch (error) {
   38	    const message =
   39	      error instanceof Error ? error.message : "Could not delete the order.";
   40	    return new Response(superjson.stringify({ error: message }), {
   41	      status: 400,
   42	    });
   43	  }
   44	}
