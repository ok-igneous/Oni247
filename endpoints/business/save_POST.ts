import superjson from "superjson";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { schema, type OutputType } from "./save_POST.schema";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";

/** Slugs the app itself needs, so a business can never take one. */
const RESERVED_SLUGS = new Set([
  "admin",
   10	  "api",
   11	  "dashboard",
   12	  "login",
   13	  "logout",
   14	  "oniduka",
   15	  "register",
   16	  "setup",
   17	  "store",
   18	  "support",
   19	  "www",
   20	]);
   21	
   22	export async function handle(request: Request) {
   23	  let userId: number;
   24	  try {
   25	    const session = await getServerUserSession(request);
   26	    userId = session.user.id;
   27	  } catch {
   28	    return new Response(superjson.stringify({ error: "Not authenticated" }), {
   29	      status: 401,
   30	    });
   31	  }
   32	
   33	  try {
   34	    const json = superjson.parse(await request.text());
   35	    const input = schema.parse(json);
   36	
   37	    if (RESERVED_SLUGS.has(input.slug)) {
   38	      return new Response(
   39	        superjson.stringify({
   40	          error: "That page address is reserved. Please choose another.",
   41	        }),
   42	        { status: 400 },
   43	      );
   44	    }
   45	
   46	    // The owner's existing business comes from the SESSION, never from the
   47	    // request body — there is no id for a client to swap.
   48	    const existing = await db
   49	      .selectFrom("businesses")
   50	      .select(["id"])
   51	      .where("ownerId", "=", userId)
   52	      .limit(1)
   53	      .executeTakeFirst();
   54	
   55	    let slugQuery = db
   56	      .selectFrom("businesses")
   57	      .select(["id"])
   58	      .where("slug", "=", input.slug);
   59	    if (existing) {
   60	      slugQuery = slugQuery.where("id", "!=", existing.id);
   61	    }
   62	    const slugTaken = await slugQuery.limit(1).executeTakeFirst();
   63	
   64	    if (slugTaken) {
   65	      return new Response(
   66	        superjson.stringify({
   67	          error: "That page address is already taken. Please choose another.",
   68	        }),
   69	        { status: 409 },
   70	      );
   71	    }
   72	
   73	    const values = {
   74	      name: input.name,
   75	      slug: input.slug,
   76	      description: input.description,
   77	      logoUrl: input.logoUrl,
   78	      ...(input.heroHeadline !== undefined ? { heroHeadline: input.heroHeadline } : {}),
   79	      ...(input.heroSubtext !== undefined ? { heroSubtext: input.heroSubtext } : {}),
   80	      ...(input.heroImageUrl !== undefined ? { heroImageUrl: input.heroImageUrl } : {}),
   81	      ...(input.heroCtaLabel !== undefined ? { heroCtaLabel: input.heroCtaLabel } : {}),
   82	      phone: input.phone,
   83	      whatsappNumber: input.whatsappNumber,
   84	      email: input.email,
   85	      address: input.address,
   86	      openingHours: input.openingHours,
   87	      themeId: input.themeId,
   88	      currency: input.currency,
   89	      status: input.status,
   90	      ...(input.appearanceSettings !== undefined ? { appearanceSettings: input.appearanceSettings } : {}),
   91	      ...(input.contentSettings !== undefined ? { contentSettings: input.contentSettings } : {}),
   92	    };
   93	
   94	    const business = existing
   95	      ? await db
   96	          .updateTable("businesses")
   97	          .set({ ...values, updatedAt: new Date() })
   98	          .where("id", "=", existing.id)
   99	          .where("ownerId", "=", userId)
  100	          .returningAll()
  101	          .executeTakeFirstOrThrow()
  102	      : await db
  103	          .insertInto("businesses")
  104	          .values({
  105	            ...values,
  106	            ownerId: userId,
  107	            // The one-time Premium Plus trial begins when the business is first
  108	            // created. Persist the used flag so it cannot be started again.
  109	            plan: "free",
  110	            websitePlan: "one_page",
  111	            premiumTrialUsed: true,
  112	            trialEndsAt: new Date(
  113	              Date.now() + subscriptionPlan.trialDays * 24 * 60 * 60 * 1000,
  114	            ),
  115	          })
  116	          .returningAll()
  117	          .executeTakeFirstOrThrow();
  118	
  119	    return new Response(
  120	      superjson.stringify({ business } satisfies OutputType),
  121	      { headers: { "Content-Type": "application/json" } },
  122	    );
  123	  } catch (error) {
  124	    const message =
  125	      error instanceof Error ? error.message : "Could not save the business.";
  126	    return new Response(superjson.stringify({ error: message }), {
  127	      status: 400,
  128	    });
  129	  }
  130	}
