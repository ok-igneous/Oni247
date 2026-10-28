import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../helpers/db";
import { schema, type OutputType } from "./showcase_GET.schema";
import { subscriptionPlan } from "../helpers/subscriptionPlan";

export async function handle(request: Request) {
  try {
    const url = new URL(request.url);
   10	    const input = schema.parse({ code: url.searchParams.get("code") ?? "" });
   11	
   12	    const showcase = await db
   13	      .selectFrom("showcases")
   14	      .innerJoin("businesses", "businesses.id", "showcases.businessId")
   15	      .select([
   16	        "showcases.id",
   17	        "showcases.code",
   18	        "showcases.title",
   19	        "showcases.description",
   20	        "showcases.productIds",
   21	        "businesses.id as businessId",
   22	        "businesses.name as businessName",
   23	        "businesses.slug as businessSlug",
   24	        "businesses.logoUrl as businessLogo",
   25	        "businesses.phone as businessPhone",
   26	        "businesses.whatsappNumber as businessWhatsapp",
   27	        "businesses.currency as businessCurrency",
   28	        "businesses.plan as businessPlan",
   29	        "businesses.trialEndsAt as trialEndsAt",
   30	        "businesses.planRenewsAt as planRenewsAt",
   31	      ])
   32	      .where("showcases.code", "=", input.code)
   33	      // A collection from an unpublished or suspended shop stays private.
   34	      .where("businesses.status", "=", "published")
   35	      .limit(1)
   36	      .executeTakeFirst();
   37	
   38	    if (!showcase) {
   39	      return new Response(
   40	        superjson.stringify({ error: "This collection was not found." }),
   41	        { status: 404 },
   42	      );
   43	    }
   44	    if (!subscriptionPlan.resolve({
   45	      plan: showcase.businessPlan,
   46	      trialEndsAt: showcase.trialEndsAt,
   47	      planRenewsAt: showcase.planRenewsAt,
   48	    }).canCreateCollection) {
   49	      return new Response(superjson.stringify({ error: "This collection is available on Premium." }), { status: 404 });
   50	    }
   51	
   52	    const ids = (Array.isArray(showcase.productIds)
   53	      ? showcase.productIds
   54	      : []) as string[];
   55	
   56	    const rows =
   57	      ids.length > 0
   58	        ? await db
   59	            .selectFrom("products")
   60	            .select([
   61	              "id",
   62	              "categoryId",
   63	              "name",
   64	              "slug",
   65	              "description",
   66	              "price",
   67	              "currency",
   68	              "imageUrl",
   69	              "available",
   70	              "featured",
   71	            ])
   72	            .where("businessId", "=", showcase.businessId)
   73	            .where("id", "in", ids)
   74	            .execute()
   75	        : [];
   76	
   77	    // Keep the order the shop chose, not the database's.
   78	    const products = ids
   79	      .map((id) => rows.find((row) => row.id === id))
   80	      .filter((row): row is NonNullable<typeof row> => Boolean(row))
   81	      .map((row) => ({ ...row, price: Number.parseFloat(row.price) }));
   82	
   83	    void db
   84	      .updateTable("showcases")
   85	      .set({ viewCount: sql`view_count + 1` })
   86	      .where("id", "=", showcase.id)
   87	      .execute()
   88	      .catch(() => {
   89	        /* a view counter must never break the page */
   90	      });
   91	
   92	    const output: OutputType = {
   93	      showcase: {
   94	        title: showcase.title,
   95	        description: showcase.description,
   96	        code: showcase.code,
   97	      },
   98	      business: {
   99	        name: showcase.businessName,
  100	        slug: showcase.businessSlug,
  101	        logoUrl: showcase.businessLogo,
  102	        phone: showcase.businessPhone,
  103	        whatsappNumber: showcase.businessWhatsapp,
  104	        currency: showcase.businessCurrency,
  105	      },
  106	      products,
  107	    };
  108	
  109	    return new Response(superjson.stringify(output satisfies OutputType), {
  110	      headers: { "Content-Type": "application/json" },
  111	    });
  112	  } catch (error) {
  113	    const message =
  114	      error instanceof Error ? error.message : "Could not load this collection.";
  115	    return new Response(superjson.stringify({ error: message }), {
  116	      status: 400,
  117	    });
  118	  }
  119	}
