import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { schema, type OutputType } from "./save_POST.schema";

export async function handle(request: Request) {
  let businessId: string;
  let canEdit: boolean;
   10	  try {
   11	    const { business } = await requireOwnedBusiness(request);
   12	    businessId = business.id;
   13	    canEdit = subscriptionPlan.resolve(business).canEditPresence;
   14	  } catch {
   15	    return new Response(superjson.stringify({ error: "Not authenticated" }), {
   16	      status: 401,
   17	    });
   18	  }
   19	
   20	  if (!canEdit) {
   21	    return new Response(
   22	      superjson.stringify({
   23	        error: "Testimonials and portfolio are part of Premium.",
   24	      }),
   25	      { status: 402 },
   26	    );
   27	  }
   28	
   29	  try {
   30	    const json = superjson.parse(await request.text());
   31	    const input = schema.parse(json);
   32	
   33	    if (input.kind === "testimonial") {
   34	      const values = {
   35	        authorName: input.authorName,
   36	        authorRole: input.authorRole,
   37	        quote: input.quote,
   38	        rating: input.rating ?? null,
   39	        published: input.published,
   40	        sortOrder: input.sortOrder,
   41	      };
   42	      const row = input.id
   43	        ? await db
   44	            .updateTable("testimonials")
   45	            .set({ ...values, updatedAt: new Date() })
   46	            .where("id", "=", input.id)
   47	            .where("businessId", "=", businessId)
   48	            .returning(["id"])
   49	            .executeTakeFirst()
   50	        : await db
   51	            .insertInto("testimonials")
   52	            .values({ ...values, businessId })
   53	            .returning(["id"])
   54	            .executeTakeFirstOrThrow();
   55	      if (!row) {
   56	        return new Response(
   57	          superjson.stringify({ error: "Testimonial not found." }),
   58	          { status: 404 },
   59	        );
   60	      }
   61	    } else {
   62	      const values = {
   63	        title: input.title,
   64	        description: input.description,
   65	        imageUrl: input.imageUrl,
   66	        linkUrl: input.linkUrl,
   67	        sortOrder: input.sortOrder,
   68	      };
   69	      const row = input.id
   70	        ? await db
   71	            .updateTable("portfolioItems")
   72	            .set({ ...values, updatedAt: new Date() })
   73	            .where("id", "=", input.id)
   74	            .where("businessId", "=", businessId)
   75	            .returning(["id"])
   76	            .executeTakeFirst()
   77	        : await db
   78	            .insertInto("portfolioItems")
   79	            .values({ ...values, businessId })
   80	            .returning(["id"])
   81	            .executeTakeFirstOrThrow();
   82	      if (!row) {
   83	        return new Response(
   84	          superjson.stringify({ error: "Portfolio item not found." }),
   85	          { status: 404 },
   86	        );
   87	      }
   88	    }
   89	
   90	    return new Response(
   91	      superjson.stringify({ saved: true } satisfies OutputType),
   92	      { headers: { "Content-Type": "application/json" } },
   93	    );
   94	  } catch (error) {
   95	    const message =
   96	      error instanceof Error ? error.message : "Could not save.";
   97	    return new Response(superjson.stringify({ error: message }), {
   98	      status: 400,
   99	    });
  100	  }
  101	}
