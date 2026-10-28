import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { OrderLine, OutputType } from "./list_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);

   10	    const rows = await db
   11	      .selectFrom("orders")
   12	      .selectAll()
   13	      .where("businessId", "=", business.id)
   14	      .orderBy("createdAt", "desc")
   15	      .limit(200)
   16	      .execute();
   17	
   18	    const orders = rows.map((row) => ({
   19	      id: row.id,
   20	      trackingCode: row.trackingCode,
   21	      customerName: row.customerName,
   22	      customerPhone: row.customerPhone,
   23	      items: (Array.isArray(row.items) ? row.items : []) as OrderLine[],
   24	      totalAmount: Number.parseFloat(row.totalAmount),
   25	      currency: row.currency,
   26	      status: row.status,
   27	      shippingStatus: row.shippingStatus,
   28	      source: row.source,
   29	      deliveryAddress: row.deliveryAddress,
   30	      ownerNote: row.ownerNote,
   31	      createdAt: row.createdAt,
   32	    }));
   33	
   34	    return new Response(superjson.stringify({ orders } satisfies OutputType), {
   35	      headers: { "Content-Type": "application/json" },
   36	    });
   37	  } catch (error) {
   38	    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
   39	    return new Response(
   40	      superjson.stringify({
   41	        error: noBusiness ? "Create your business page first." : "Not authenticated",
   42	      }),
   43	      { status: noBusiness ? 400 : 401 },
   44	    );
   45	  }
   46	}
