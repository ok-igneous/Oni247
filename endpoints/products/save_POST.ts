import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { toSlug } from "../../helpers/toSlug";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { schema, type OutputType } from "./save_POST.schema";

/** Unique within one business; never collides across businesses. */
const uniqueSlug = async (
   10	  businessId: string,
   11	  name: string,
   12	  currentId: string | null,
   13	): Promise<string> => {
   14	  const base = toSlug(name) || "item";
   15	  for (let attempt = 0; attempt < 25; attempt += 1) {
   16	    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
   17	    let query = db
   18	      .selectFrom("products")
   19	      .select(["id"])
   20	      .where("businessId", "=", businessId)
   21	      .where("slug", "=", candidate);
   22	    if (currentId) {
   23	      query = query.where("id", "!=", currentId);
   24	    }
   25	    const taken = await query.limit(1).executeTakeFirst();
   26	    if (!taken) return candidate;
   27	  }
   28	  return `${base}-${Date.now()}`;
   29	};
   30	
   31	export async function handle(request: Request) {
   32	  let businessId: string;
   33	  let currency: string;
   34	  let planLimit: number | null;
   35	  try {
   36	    const { business } = await requireOwnedBusiness(request);
   37	    businessId = business.id;
   38	    currency = business.currency;
   39	    planLimit = subscriptionPlan.resolve(business).productLimit;
   40	  } catch {
   41	    return new Response(superjson.stringify({ error: "Not authenticated" }), {
   42	      status: 401,
   43	    });
   44	  }
   45	
   46	  try {
   47	    const json = superjson.parse(await request.text());
   48	    const input = schema.parse(json);
   49	
   50	    // Only creating a product is limited — editing what you already have is
   51	    // always allowed, so a lapsed plan never locks you out of your own data.
   52	    if (!input.id && planLimit !== null) {
   53	      const existing = await db
   54	        .selectFrom("products")
   55	        .select(({ fn }) => fn.countAll<string>().as("count"))
   56	        .where("businessId", "=", businessId)
   57	        .executeTakeFirstOrThrow();
   58	
   59	      if (Number(existing.count) >= planLimit) {
   60	        return new Response(
   61	          superjson.stringify({
   62	            error: `The free plan covers ${planLimit} products. Upgrade to list more.`,
   63	          }),
   64	          { status: 402 },
   65	        );
   66	      }
   67	      const dayStart = new Date();
   68	      dayStart.setUTCHours(0, 0, 0, 0);
   69	      const attempts = await db
   70	        .selectFrom("productCreationAttempts")
   71	        .select(({ fn }) => fn.countAll<string>().as("count"))
   72	        .where("businessId", "=", businessId)
   73	        .where("createdAt", ">=", dayStart)
   74	        .executeTakeFirstOrThrow();
   75	      if (Number(attempts.count) >= subscriptionPlan.freeDailyCreationLimit) {
   76	        return new Response(
   77	          superjson.stringify({ error: "Free plan allows 2 product/service creations per day." }),
   78	          { status: 402 },
   79	        );
   80	      }
   81	    }
   82	
   83	    // A category id from the client is only accepted if it belongs to THIS
   84	    // business — otherwise a shop could file its products under another's.
   85	    if (input.categoryId) {
   86	      const owned = await db
   87	        .selectFrom("categories")
   88	        .select(["id"])
   89	        .where("id", "=", input.categoryId)
   90	        .where("businessId", "=", businessId)
   91	        .limit(1)
   92	        .executeTakeFirst();
   93	      if (!owned) {
   94	        return new Response(
   95	          superjson.stringify({ error: "That category does not exist." }),
   96	          { status: 400 },
   97	        );
   98	      }
   99	    }
  100	
  101	    const slug = await uniqueSlug(businessId, input.name, input.id ?? null);
  102	
  103	    const values = {
  104	      categoryId: input.categoryId ?? null,
  105	      name: input.name,
  106	      slug,
  107	      description: input.description,
  108	      price: input.price.toFixed(2),
  109	      costPrice: input.costPrice == null ? null : input.costPrice.toFixed(2),
  110	      currency,
  111	      imageUrl: input.imageUrl,
  112	      available: input.available,
  113	      featured: input.featured,
  114	      sortOrder: input.sortOrder,
  115	      unit: input.unit ?? null,
  116	      variants: input.variants ?? [],
  117	    };
  118	
  119	    const row = input.id
  120	      ? await db
  121	          .updateTable("products")
  122	          .set({ ...values, updatedAt: new Date() })
  123	          .where("id", "=", input.id)
  124	          .where("businessId", "=", businessId)
  125	          .returningAll()
  126	          .executeTakeFirst()
  127	      : await db
  128	          .insertInto("products")
  129	          .values({ ...values, businessId })
  130	          .returningAll()
  131	          .executeTakeFirstOrThrow();
  132	
  133	    if (!input.id && planLimit !== null) {
  134	      await db.insertInto("productCreationAttempts").values({ businessId }).execute();
  135	    }
  136	
  137	    if (!row) {
  138	      return new Response(superjson.stringify({ error: "Product not found." }), {
  139	        status: 404,
  140	      });
  141	    }
  142	
  143	    const output: OutputType = {
  144	      product: {
  145	        id: row.id,
  146	        categoryId: row.categoryId,
  147	        name: row.name,
  148	        slug: row.slug,
  149	        description: row.description,
  150	        price: Number.parseFloat(row.price),
  151	        costPrice: row.costPrice == null ? null : Number.parseFloat(row.costPrice),
  152	        currency: row.currency,
  153	        imageUrl: row.imageUrl,
  154	        available: row.available,
  155	        featured: row.featured,
  156	        sortOrder: row.sortOrder,
  157	        unit: row.unit,
  158	        variants: Array.isArray(row.variants)
  159	          ? (row.variants as Array<{ name: string; value: string; price: number | null }>)
  160	          : [],
  161	      },
  162	    };
  163	
  164	    return new Response(superjson.stringify(output satisfies OutputType), {
  165	      headers: { "Content-Type": "application/json" },
  166	    });
  167	  } catch (error) {
  168	    const message =
  169	      error instanceof Error ? error.message : "Could not save the product.";
  170	    return new Response(superjson.stringify({ error: message }), {
  171	      status: 400,
  172	    });
  173	  }
  174	}
