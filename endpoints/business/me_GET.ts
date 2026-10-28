import superjson from "superjson";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import type { OutputType } from "./me_GET.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);

   10	    const business = await db
   11	      .selectFrom("businesses")
   12	      .selectAll()
   13	      .where("ownerId", "=", user.id)
   14	      .limit(1)
   15	      .executeTakeFirst();
   16	
   17	    return new Response(
   18	      superjson.stringify({ business: business ?? null } satisfies OutputType),
   19	      { headers: { "Content-Type": "application/json" } },
   20	    );
   21	  } catch (error) {
   22	    const message = error instanceof Error ? error.message : "Not authenticated";
   23	    return new Response(superjson.stringify({ error: message }), {
   24	      status: 401,
   25	    });
   26	  }
   27	}
