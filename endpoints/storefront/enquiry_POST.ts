import superjson from "superjson";
import { db } from "../../helpers/db";
import { schema, type OutputType } from "./enquiry_POST.schema";

/** Cheap flood guard: one business cannot be given more than this in an hour. */
const MAX_ENQUIRIES_PER_HOUR = 30;

export async function handle(request: Request) {
  try {
   10	    const json = superjson.parse(await request.text());
   11	    const input = schema.parse(json);
   12	
   13	    const business = await db
   14	      .selectFrom("businesses")
   15	      .select(["id"])
   16	      .where("slug", "=", input.slug)
   17	      .where("status", "=", "published")
   18	      .limit(1)
   19	      .executeTakeFirst();
   20	
   21	    if (!business) {
   22	      return new Response(
   23	        superjson.stringify({ error: "This business page was not found." }),
   24	        { status: 404 },
   25	      );
   26	    }
   27	
   28	    const recent = await db
   29	      .selectFrom("enquiries")
   30	      .select(({ fn }) => fn.countAll<string>().as("count"))
   31	      .where("businessId", "=", business.id)
   32	      .where("createdAt", ">", new Date(Date.now() - 60 * 60 * 1000))
   33	      .executeTakeFirstOrThrow();
   34	
   35	    if (Number(recent.count) >= MAX_ENQUIRIES_PER_HOUR) {
   36	      return new Response(
   37	        superjson.stringify({
   38	          error: "Too many messages right now. Please try again later.",
   39	        }),
   40	        { status: 429 },
   41	      );
   42	    }
   43	
   44	    await db
   45	      .insertInto("enquiries")
   46	      .values({
   47	        businessId: business.id,
   48	        customerName: input.customerName,
   49	        customerPhone: input.customerPhone,
   50	        customerEmail: input.customerEmail,
   51	        message: input.message,
   52	        status: "new",
   53	      })
   54	      .executeTakeFirstOrThrow();
   55	
   56	    return new Response(
   57	      superjson.stringify({ sent: true } satisfies OutputType),
   58	      { headers: { "Content-Type": "application/json" } },
   59	    );
   60	  } catch (error) {
   61	    const message =
   62	      error instanceof Error ? error.message : "Could not send your message.";
   63	    return new Response(superjson.stringify({ error: message }), {
   64	      status: 400,
   65	    });
   66	  }
   67	}
