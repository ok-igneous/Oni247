import superjson from "superjson";
import { db } from "../helpers/db";
import { schema, type OutputType } from "./storefront_GET.schema";
import { subscriptionPlan } from "../helpers/subscriptionPlan";
import { sanitizeBlogContent } from "../helpers/sanitizeBlogContent";

const MAX_PRODUCTS = 200;

export async function handle(request: Request) {
   10	  try {
   11	    const url = new URL(request.url);
   12	    const input = schema.parse({ slug: url.searchParams.get("slug") ?? "" });
   13	
   14	    const business = await db
   15	      .selectFrom("businesses")
   16	      .select([
   17	        "id",
   18	        "slug",
   19	        "name",
   20	        "description",
   21	        "logoUrl",
   22	        "heroHeadline",
   23	        "heroSubtext",
   24	        "heroImageUrl",
   25	        "heroCtaLabel",
   26	        "appearanceSettings",
   27	        "contentSettings",
   28	        "phone",
   29	        "whatsappNumber",
   30	        "email",
   31	        "address",
   32	        "openingHours",
   33	        "themeId",
   34	        "currency",
   35	        "plan",
   36	        "websitePlan",
   37	        "trialEndsAt",
   38	        "planRenewsAt",
   39	      ])
   40	      .where("slug", "=", input.slug)
   41	      .where("status", "=", "published")
   42	      .limit(1)
   43	      .executeTakeFirst();
   44	
   45	    if (!business) {
   46	      return new Response(
   47	        superjson.stringify({ error: "This business page was not found." }),
   48	        { status: 404 },
   49	      );
   50	    }
   51	
   52	    const resolvedPlan = subscriptionPlan.resolve(business);
   53	
   54	    const rawServices = business.contentSettings && typeof business.contentSettings === "object" && !Array.isArray(business.contentSettings) ? (business.contentSettings as Record<string, unknown>).services : null;
   55	    const services: OutputType["services"] = Array.isArray(rawServices) ? rawServices.filter((s) => s && typeof s === "object" && !Array.isArray(s) && (s as Record<string, unknown>).published !== false).map((s) => { const x=s as Record<string, unknown>; return { id:typeof x.id === "string" ? x.id : crypto.randomUUID(), name:typeof x.name === "string" ? x.name : "Service", description:typeof x.description === "string" ? x.description : "", imageUrl:typeof x.imageUrl === "string" ? x.imageUrl : null, price:typeof x.price === "string" ? x.price : "", priceType:x.priceType === "fixed" || x.priceType === "contact" ? x.priceType : "starting", duration:typeof x.duration === "string" ? x.duration : "", category:typeof x.category === "string" ? x.category : "", featured:x.featured === true, published:true, cta:x.cta === "whatsapp" || x.cta === "call" || x.cta === "enquire" ? x.cta : "request" }; }) : [];
   56	
   57	    const [categories, products, testimonials, portfolio, blogPosts] = await Promise.all([
   58	      db
   59	        .selectFrom("categories")
   60	        .select(["id", "name", "description"])
   61	        .where("businessId", "=", business.id)
   62	        .orderBy("sortOrder", "asc")
   63	        .orderBy("name", "asc")
   64	        .execute(),
   65	      db
   66	        .selectFrom("products")
   67	        .select([
   68	          "id",
   69	          "categoryId",
   70	          "name",
   71	          "slug",
   72	          "description",
   73	          "price",
   74	          "currency",
   75	          "imageUrl",
   76	          "available",
   77	          "featured",
   78	          "costPrice",
   79	          "unit",
   80	          "variants",
   81	        ])
   82	        .where("businessId", "=", business.id)
   83	        .orderBy("sortOrder", "asc")
   84	        .orderBy("createdAt", "asc")
   85	        .limit(MAX_PRODUCTS)
   86	        .execute(),
   87	      db
   88	        .selectFrom("testimonials")
   89	        .select(["id", "authorName", "authorRole", "quote", "rating"])
   90	        .where("businessId", "=", business.id)
   91	        .where("published", "=", true)
   92	        .orderBy("sortOrder", "asc")
   93	        .orderBy("createdAt", "asc")
   94	        .limit(30)
   95	        .execute(),
   96	      db
   97	        .selectFrom("portfolioItems")
   98	        .select(["id", "title", "description", "imageUrl", "linkUrl"])
   99	        .where("businessId", "=", business.id)
  100	        .orderBy("sortOrder", "asc")
  101	        .orderBy("createdAt", "asc")
  102	        .limit(60)
  103	        .execute(),
  104	      db
  105	        .selectFrom("blogPosts")
  106	        .select(["id", "slug", "title", "excerpt", "coverImageUrl", "content", "publishedAt"])
  107	        .where("businessId", "=", business.id)
  108	        .where("published", "=", true)
  109	        .orderBy("publishedAt", "desc")
  110	        .orderBy("createdAt", "desc")
  111	        .limit(12)
  112	        .execute(),
  113	    ]);
  114	
  115	    const output: OutputType = {
  116	      business: {
  117	        ...business,
  118	        appearanceSettings:
  119	          business.appearanceSettings &&
  120	          typeof business.appearanceSettings === "object" &&
  121	          !Array.isArray(business.appearanceSettings)
  122	            ? (business.appearanceSettings as Record<string, unknown>)
  123	            : {},
  124	        contentSettings:
  125	          business.contentSettings &&
  126	          typeof business.contentSettings === "object" &&
  127	          !Array.isArray(business.contentSettings)
  128	            ? (business.contentSettings as Record<string, unknown>)
  129	            : {},
  130	        canUseProductLinks: resolvedPlan.canUseProductLinks,
  131	        canUseMultiPage: resolvedPlan.canUseMultiPage,
  132	      },
  133	      categories,
  134	      services: resolvedPlan.canUseServices ? services : [],
  135	      products: products.map((product) => ({
  136	        ...product,
  137	        price: Number.parseFloat(product.price),
  138	        variants: Array.isArray(product.variants)
  139	          ? (product.variants as Array<{ name: string; value: string; price: number | null }>)
  140	          : [],
  141	      })),
  142	      testimonials,
  143	      portfolio,
  144	      blogPosts: resolvedPlan.canUseBlog ? blogPosts.map((post) => ({ ...post, content: sanitizeBlogContent(post.content) })) : [],
  145	    };
  146	
  147	    return new Response(superjson.stringify(output satisfies OutputType), {
  148	      headers: { "Content-Type": "application/json" },
  149	    });
  150	  } catch (error) {
  151	    const message =
  152	      error instanceof Error ? error.message : "Could not load this store.";
  153	    return new Response(superjson.stringify({ error: message }), {
  154	      status: 400,
  155	    });
  156	  }
  157	}
