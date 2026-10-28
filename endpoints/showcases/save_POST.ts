import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { generateTrackingCode } from "../../helpers/generateTrackingCode";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { schema, type OutputType } from "./save_POST.schema";

export async function handle(request: Request) {
  let businessId: string;
   10	  try {
   11	    const { business } = await requireOwnedBusiness(request);
   12	    businessId = business.id;
   13	    if (!subscriptionPlan.resolve(business).canCreateCollection) {
   14	      return new Response(
   15	        superjson.stringify({ error: "Collections are available on Premium." }),
   16	        { status: 402 },
   17	      );
   18	    }
   19	  } catch {
   20	    return new Response(superjson.stringify({ error: "Not authenticated" }), {
   21	      status: 401,
   22	    });
   23	  }
   24	
   25	  try {
   26	    const json = superjson.parse(await request.text());
   27	    const input = schema.parse(json);
   28	
   29	    // Only this shop's own products may go in a collection.
   30	    const owned = await db
   31	      .selectFrom("products")
   32	      .select(["id"])
   33	      .where("businessId", "=", businessId)
   34	      .where("id", "in", input.productIds)
   35	      .execute();
   36	
   37	    const ownedIds = new Set(owned.map((row) => row.id));
   38	    const productIds = input.productIds.filter((id) => ownedIds.has(id));
   39	
   40	    if (productIds.length === 0) {
   41	      return new Response(
   42	        superjson.stringify({ error: "None of those products were found." }),
   43	        { status: 400 },
   44	      );
   45	    }
   46	
   47	    const values = {
   48	      title: input.title,
   49	      description: input.description,
   50	      productIds,
   51	    };
   52	
   53	    let row;
   54	    if (input.id) {
   55	      row = await db
   56	        .updateTable("showcases")
   57	        .set({ ...values, updatedAt: new Date() })
   58	        .where("id", "=", input.id)
   59	        .where("businessId", "=", businessId)
   60	        .returningAll()
   61	        .executeTakeFirst();
   62	    } else {
   63	      for (let attempt = 0; attempt < 5 && !row; attempt += 1) {
   64	        try {
   65	          row = await db
   66	            .insertInto("showcases")
   67	            .values({ ...values, businessId, code: generateTrackingCode() })
   68	            .returningAll()
   69	            .executeTakeFirstOrThrow();
   70	        } catch (insertError) {
   71	          const message = insertError instanceof Error ? insertError.message : "";
   72	          if (!message.includes("showcases_code_key")) throw insertError;
   73	        }
   74	      }
   75	    }
   76	
   77	    if (!row) {
   78	      return new Response(
   79	        superjson.stringify({ error: "Collection not found." }),
   80	        { status: 404 },
   81	      );
   82	    }
   83	
   84	    const output: OutputType = {
   85	      showcase: {
   86	        id: row.id,
   87	        code: row.code,
   88	        title: row.title,
   89	        description: row.description,
   90	        productIds: (Array.isArray(row.productIds) ? row.productIds : []) as string[],
   91	        viewCount: row.viewCount,
   92	        createdAt: row.createdAt,
   93	      },
   94	    };
   95	
   96	    return new Response(superjson.stringify(output satisfies OutputType), {
   97	      headers: { "Content-Type": "application/json" },
   98	    });
   99	  } catch (error) {
  100	    const message =
  101	      error instanceof Error ? error.message : "Could not save the collection.";
  102	    return new Response(superjson.stringify({ error: message }), {
  103	      status: 400,
  104	    });
  105	  }
  106	}
