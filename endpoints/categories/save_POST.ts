import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { schema, type OutputType } from "./save_POST.schema";

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
   21	    const values = {
   22	      name: input.name,
   23	      description: input.description,
   24	      sortOrder: input.sortOrder,
   25	    };
   26	
   27	    // On update the businessId filter is what enforces isolation: an id
   28	    // belonging to another shop simply matches no row.
   29	    const category = input.id
   30	      ? await db
   31	          .updateTable("categories")
   32	          .set({ ...values, updatedAt: new Date() })
   33	          .where("id", "=", input.id)
   34	          .where("businessId", "=", businessId)
   35	          .returningAll()
   36	          .executeTakeFirst()
   37	      : await db
   38	          .insertInto("categories")
   39	          .values({ ...values, businessId })
   40	          .returningAll()
   41	          .executeTakeFirstOrThrow();
   42	
   43	    if (!category) {
   44	      return new Response(
   45	        superjson.stringify({ error: "Category not found." }),
   46	        { status: 404 },
   47	      );
   48	    }
   49	
   50	    return new Response(
   51	      superjson.stringify({ category } satisfies OutputType),
   52	      { headers: { "Content-Type": "application/json" } },
   53	    );
   54	  } catch (error) {
   55	    const message =
   56	      error instanceof Error ? error.message : "Could not save the category.";
   57	    return new Response(superjson.stringify({ error: message }), {
   58	      status: 400,
   59	    });
   60	  }
   61	}
