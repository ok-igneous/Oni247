import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { schema, type OutputType } from "./update_POST.schema";

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
   21	    const patch: Record<string, unknown> = { updatedAt: new Date() };
   22	    if (input.status !== undefined) patch.status = input.status;
   23	    if (input.shippingStatus !== undefined)
   24	      patch.shippingStatus = input.shippingStatus;
   25	    if (input.ownerNote !== undefined) patch.ownerNote = input.ownerNote;
   26	    if (input.deliveryAddress !== undefined)
   27	      patch.deliveryAddress = input.deliveryAddress;
   28	
   29	    const result = await db
   30	      .updateTable("orders")
   31	      .set(patch)
   32	      .where("id", "=", input.id)
   33	      .where("businessId", "=", businessId)
   34	      .executeTakeFirst();
   35	
   36	    if (Number(result.numUpdatedRows ?? 0) === 0) {
   37	      return new Response(superjson.stringify({ error: "Order not found." }), {
   38	        status: 404,
   39	      });
   40	    }
   41	
   42	    return new Response(
   43	      superjson.stringify({ updated: true } satisfies OutputType),
   44	      { headers: { "Content-Type": "application/json" } },
   45	    );
   46	  } catch (error) {
   47	    const message =
   48	      error instanceof Error ? error.message : "Could not update the order.";
   49	    return new Response(superjson.stringify({ error: message }), {
   50	      status: 400,
   51	    });
   52	  }
   53	}
