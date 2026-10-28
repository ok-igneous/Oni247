import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireAdmin } from "../../helpers/requireAdmin";
import { schema, type OutputType } from "./setStatus_POST.schema";

/**
 * Suspend or restore a shop. Suspending only hides the public page — the
 * owner keeps their dashboard and every row of their data.
 */
   10	export async function handle(request: Request) {
   11	  try {
   12	    await requireAdmin(request);
   13	  } catch (error) {
   14	    const notAdmin = error instanceof Error && error.message === "NOT_ADMIN";
   15	    return new Response(
   16	      superjson.stringify({
   17	        error: notAdmin ? "Administrator access required." : "Not authenticated",
   18	      }),
   19	      { status: notAdmin ? 403 : 401 },
   20	    );
   21	  }
   22	
   23	  try {
   24	    const json = superjson.parse(await request.text());
   25	    const input = schema.parse(json);
   26	
   27	    const result = await db
   28	      .updateTable("businesses")
   29	      .set({ status: input.status, updatedAt: new Date() })
   30	      .where("id", "=", input.businessId)
   31	      .executeTakeFirst();
   32	
   33	    if (Number(result.numUpdatedRows ?? 0) === 0) {
   34	      return new Response(
   35	        superjson.stringify({ error: "Business not found." }),
   36	        { status: 404 },
   37	      );
   38	    }
   39	
   40	    return new Response(
   41	      superjson.stringify({ updated: true } satisfies OutputType),
   42	      { headers: { "Content-Type": "application/json" } },
   43	    );
   44	  } catch (error) {
   45	    const message =
   46	      error instanceof Error ? error.message : "Could not update the business.";
   47	    return new Response(superjson.stringify({ error: message }), {
   48	      status: 400,
   49	    });
   50	  }
   51	}
