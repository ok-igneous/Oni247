import superjson from "superjson";
import { db } from "../../helpers/db";
import { generateTrackingCode } from "../../helpers/generateTrackingCode";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { schema, type OutputType } from "./create_POST.schema";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";

/** A sale the owner records themselves — walk-in, phone, or a repeat customer. */
export async function handle(request: Request) {
   10	  let businessId: string;
   11	  let currency: string;
   12	  let businessForPlan: Awaited<ReturnType<typeof requireOwnedBusiness>>["business"];
   13	  try {
   14	    const { business } = await requireOwnedBusiness(request);
   15	    businessId = business.id;
   16	    currency = business.currency;
   17	    businessForPlan = business;
   18	  } catch {
   19	    return new Response(superjson.stringify({ error: "Not authenticated" }), {
   20	      status: 401,
   21	    });
   22	  }
   23	
   24	  try {
   25	    const json = superjson.parse(await request.text());
   26	    const input = schema.parse(json);
   27	
   28	    const ids = [...new Set(input.items.map((item) => item.productId))];
   29	    const products = await db
   30	      .selectFrom("products")
   31	      .select(["id", "name", "price", "costPrice"])
   32	      .where("businessId", "=", businessId)
   33	      .where("id", "in", ids)
   34	      .execute();
   35	
   36	    // Unlike the storefront, a direct sale may include out-of-stock items —
   37	    // the owner is looking at the shelf. Prices still come from the database.
   38	    const lines = input.items
   39	      .map((item) => {
   40	        const product = products.find((row) => row.id === item.productId);
   41	        if (!product) return null;
   42	        const unitPrice = Number.parseFloat(product.price);
   43	        return {
   44	          productId: product.id,
   45	          name: product.name,
   46	          quantity: item.quantity,
   47	          unitPrice,
   48	          unitCost: product.costPrice == null ? null : Number.parseFloat(product.costPrice),
   49	          lineTotal: Number((unitPrice * item.quantity).toFixed(2)),
   50	        };
   51	      })
   52	      .filter((line): line is NonNullable<typeof line> => line !== null);
   53	
   54	    if (lines.length === 0) {
   55	      return new Response(
   56	        superjson.stringify({ error: "None of those items were found." }),
   57	        { status: 400 },
   58	      );
   59	    }
   60	
   61	    const total = Number(
   62	      lines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2),
   63	    );
   64	
   65	    let order: { id: string; trackingCode: string } | undefined;
   66	    for (let attempt = 0; attempt < 5 && !order; attempt += 1) {
   67	      try {
   68	        order = await db
   69	          .insertInto("orders")
   70	          .values({
   71	            businessId,
   72	            customerName: input.customerName,
   73	            customerPhone: input.customerPhone,
   74	            deliveryAddress: input.deliveryAddress,
   75	            items: lines,
   76	            totalAmount: total.toFixed(2),
   77	            currency,
   78	            status: input.markCompleted ? "completed" : "pending",
   79	            source: "direct",
   80	            shippingStatus: input.deliveryAddress ? "preparing" : "not_required",
   81	            trackingCode: generateTrackingCode(),
   82	          })
   83	          .returning(["id", "trackingCode"])
   84	          .executeTakeFirstOrThrow();
   85	      } catch (insertError) {
   86	        const message = insertError instanceof Error ? insertError.message : "";
   87	        if (!message.includes("orders_tracking_code_key")) throw insertError;
   88	      }
   89	    }
   90	
   91	    if (!order) {
   92	      return new Response(
   93	        superjson.stringify({ error: "Could not record the sale." }),
   94	        { status: 500 },
   95	      );
   96	    }
   97	
   98	    return new Response(
   99	      superjson.stringify({
  100	        orderId: order.id,
  101	        trackingCode: subscriptionPlan.resolve(businessForPlan).canUseTrackingLinks ? order.trackingCode : null,
  102	        total,
  103	        currency,
  104	      } satisfies OutputType),
  105	      { headers: { "Content-Type": "application/json" } },
  106	    );
  107	  } catch (error) {
  108	    const message =
  109	      error instanceof Error ? error.message : "Could not record the sale.";
  110	    return new Response(superjson.stringify({ error: message }), {
  111	      status: 400,
  112	    });
  113	  }
  114	}
