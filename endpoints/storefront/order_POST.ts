import superjson from "superjson";
import { db } from "../../helpers/db";
import { generateTrackingCode } from "../../helpers/generateTrackingCode";
import { schema, type OutputType } from "./order_POST.schema";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";

export async function handle(request: Request) {
  try {
    const json = superjson.parse(await request.text());
   10	    const input = schema.parse(json);
   11	
   12	    const business = await db
   13	      .selectFrom("businesses")
   14	      .select(["id", "currency", "plan", "trialEndsAt", "planRenewsAt"])
   15	      .where("slug", "=", input.slug)
   16	      .where("status", "=", "published")
   17	      .limit(1)
   18	      .executeTakeFirst();
   19	
   20	    if (!business) {
   21	      return new Response(
   22	        superjson.stringify({ error: "This business page was not found." }),
   23	        { status: 404 },
   24	      );
   25	    }
   26	
   27	    // Prices and names come from the DATABASE, never from the request body —
   28	    // otherwise a customer could post their own totals.
   29	    const ids = [...new Set(input.items.map((item) => item.productId))];
   30	    const products = await db
   31	      .selectFrom("products")
   32	      .select(["id", "name", "price", "costPrice", "available"])
   33	      .where("businessId", "=", business.id)
   34	      .where("id", "in", ids)
   35	      .execute();
   36	
   37	    const lines = input.items
   38	      .map((item) => {
   39	        const product = products.find((row) => row.id === item.productId);
   40	        if (!product || !product.available) return null;
   41	        const unitPrice = Number.parseFloat(product.price);
   42	        return {
   43	          productId: product.id,
   44	          name: product.name,
   45	          quantity: item.quantity,
   46	          unitPrice,
   47	          unitCost: product.costPrice == null ? null : Number.parseFloat(product.costPrice),
   48	          lineTotal: Number((unitPrice * item.quantity).toFixed(2)),
   49	        };
   50	      })
   51	      .filter((line): line is NonNullable<typeof line> => line !== null);
   52	
   53	    if (lines.length === 0) {
   54	      return new Response(
   55	        superjson.stringify({
   56	          error: "None of those items are available right now.",
   57	        }),
   58	        { status: 400 },
   59	      );
   60	    }
   61	
   62	    const total = Number(
   63	      lines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2),
   64	    );
   65	
   66	    // The unique index is the real guard; retry on the vanishingly rare clash.
   67	    let order: { id: string; trackingCode: string } | undefined;
   68	    for (let attempt = 0; attempt < 5 && !order; attempt += 1) {
   69	      try {
   70	        order = await db
   71	          .insertInto("orders")
   72	          .values({
   73	            businessId: business.id,
   74	            customerName: input.customerName,
   75	            customerPhone: input.customerPhone,
   76	            deliveryAddress: input.deliveryAddress,
   77	            items: lines,
   78	            totalAmount: total.toFixed(2),
   79	            currency: business.currency,
   80	            status: "pending",
   81	            source: "online",
   82	            shippingStatus: input.deliveryAddress ? "preparing" : "not_required",
   83	            trackingCode: generateTrackingCode(),
   84	          })
   85	          .returning(["id", "trackingCode"])
   86	          .executeTakeFirstOrThrow();
   87	      } catch (insertError) {
   88	        const message =
   89	          insertError instanceof Error ? insertError.message : "";
   90	        if (!message.includes("orders_tracking_code_key")) throw insertError;
   91	      }
   92	    }
   93	
   94	    if (!order) {
   95	      return new Response(
   96	        superjson.stringify({ error: "Could not record the order." }),
   97	        { status: 500 },
   98	      );
   99	    }
  100	
  101	    return new Response(
  102	      superjson.stringify({
  103	        orderId: order.id,
  104	        trackingCode: subscriptionPlan.resolve(business).canUseTrackingLinks ? order.trackingCode : null,
  105	        total,
  106	        currency: business.currency,
  107	      } satisfies OutputType),
  108	      { headers: { "Content-Type": "application/json" } },
  109	    );
  110	  } catch (error) {
  111	    const message =
  112	      error instanceof Error ? error.message : "Could not record the order.";
  113	    return new Response(superjson.stringify({ error: message }), {
  114	      status: 400,
  115	    });
  116	  }
  117	}
