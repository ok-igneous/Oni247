import superjson from "superjson";
import { db } from "../helpers/db";
import { schema, type OutputType } from "./track_GET.schema";
import { subscriptionPlan } from "../helpers/subscriptionPlan";

type StoredLine = { name: string; quantity: number; lineTotal: number };

export async function handle(request: Request) {
  try {
   10	    const url = new URL(request.url);
   11	    const input = schema.parse({ code: url.searchParams.get("code") ?? "" });
   12	
   13	    const order = await db
   14	      .selectFrom("orders")
   15	      .innerJoin("businesses", "businesses.id", "orders.businessId")
   16	      .select([
   17	        "orders.trackingCode",
   18	        "orders.customerName",
   19	        "orders.items",
   20	        "orders.totalAmount",
   21	        "orders.currency",
   22	        "orders.status",
   23	        "orders.shippingStatus",
   24	        "orders.deliveryAddress",
   25	        "orders.ownerNote",
   26	        "orders.createdAt",
   27	        "orders.updatedAt",
   28	        "orders.businessId",
   29	        "businesses.name as businessName",
   30	        "businesses.slug as businessSlug",
   31	        "businesses.logoUrl as businessLogoUrl",
   32	        "businesses.heroImageUrl as businessHeroImageUrl",
   33	        "businesses.themeId as businessThemeId",
   34	        "businesses.appearanceSettings as businessAppearanceSettings",
   35	        "businesses.phone as businessPhone",
   36	        "businesses.whatsappNumber as businessWhatsapp",
   37	        "businesses.plan as businessPlan",
   38	        "businesses.websitePlan as businessWebsitePlan",
   39	        "businesses.trialEndsAt as trialEndsAt",
   40	        "businesses.planRenewsAt as planRenewsAt",
   41	      ])
   42	      .where("orders.trackingCode", "=", input.code)
   43	      .limit(1)
   44	      .executeTakeFirst();
   45	
   46	    if (!order) {
   47	      return new Response(
   48	        superjson.stringify({
   49	          error: "No order found with that code. Check it and try again.",
   50	        }),
   51	        { status: 404 },
   52	      );
   53	    }
   54	
   55	    if (!subscriptionPlan.resolve({
   56	      plan: order.businessPlan,
   57	      websitePlan: order.businessWebsitePlan,
   58	      trialEndsAt: order.trialEndsAt,
   59	      planRenewsAt: order.planRenewsAt,
   60	    }).canUseTrackingLinks) {
   61	      return new Response(
   62	        superjson.stringify({ error: "Order tracking links are available on Premium." }),
   63	        { status: 402 },
   64	      );
   65	    }
   66	
   67	    const lines = (Array.isArray(order.items) ? order.items : []) as StoredLine[];
   68	    const orderedNames = new Set(lines.map((line) => line.name));
   69	
   70	    // "You might also like" — featured first, then the rest, skipping what is
   71	    // already in this order.
   72	    const catalogue = await db
   73	      .selectFrom("products")
   74	      .select([
   75	        "id",
   76	        "categoryId",
   77	        "name",
   78	        "slug",
   79	        "description",
   80	        "price",
   81	        "currency",
   82	        "imageUrl",
   83	        "available",
   84	        "featured",
   85	      ])
   86	      .where("businessId", "=", order.businessId)
   87	      .where("available", "=", true)
   88	      .orderBy("featured", "desc")
   89	      .orderBy("sortOrder", "asc")
   90	      .limit(24)
   91	      .execute();
   92	
   93	    const recommended = catalogue
   94	      .filter((product) => !orderedNames.has(product.name))
   95	      .slice(0, 4)
   96	      .map((product) => ({
   97	        ...product,
   98	        price: Number.parseFloat(product.price),
   99	      }));
  100	
  101	    const output: OutputType = {
  102	      order: {
  103	        trackingCode: order.trackingCode,
  104	        customerName: order.customerName,
  105	        items: lines,
  106	        totalAmount: Number.parseFloat(order.totalAmount),
  107	        currency: order.currency,
  108	        status: order.status,
  109	        shippingStatus: order.shippingStatus,
  110	        deliveryAddress: order.deliveryAddress,
  111	        ownerNote: order.ownerNote,
  112	        createdAt: order.createdAt,
  113	        updatedAt: order.updatedAt,
  114	      },
  115	      business: {
  116	        name: order.businessName,
  117	        slug: order.businessSlug,
  118	        phone: order.businessPhone,
  119	        whatsappNumber: order.businessWhatsapp,
  120	        logoUrl: order.businessLogoUrl,
  121	        heroImageUrl: order.businessHeroImageUrl,
  122	        themeId: order.businessThemeId,
  123	        appearanceSettings: order.businessAppearanceSettings && typeof order.businessAppearanceSettings === "object" && !Array.isArray(order.businessAppearanceSettings) ? order.businessAppearanceSettings as Record<string, unknown> : {},
  124	      },
  125	      recommended,
  126	    };
  127	
  128	    return new Response(superjson.stringify(output satisfies OutputType), {
  129	      headers: { "Content-Type": "application/json" },
  130	    });
  131	  } catch (error) {
  132	    const message =
  133	      error instanceof Error ? error.message : "Could not find that order.";
  134	    return new Response(superjson.stringify({ error: message }), {
  135	      status: 400,
  136	    });
  137	  }
  138	}
