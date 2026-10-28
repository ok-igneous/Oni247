import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { OutputType } from "./list_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);

   10	    const rows = await db
   11	      .selectFrom("products")
   12	      .select([
   13	        "id",
   14	        "categoryId",
   15	        "name",
   16	        "slug",
   17	        "description",
   18	        "price",
   19	        "costPrice",
   20	        "currency",
   21	        "imageUrl",
   22	        "available",
   23	        "featured",
   24	        "sortOrder",
   25	        "unit",
   26	        "variants",
   27	      ])
   28	      .where("businessId", "=", business.id)
   29	      .orderBy("sortOrder", "asc")
   30	      .orderBy("createdAt", "asc")
   31	      .execute();
   32	
   33	    const products = rows.map((row) => ({
   34	      ...row,
   35	      price: Number.parseFloat(row.price),
   36	      costPrice: row.costPrice == null ? null : Number.parseFloat(row.costPrice),
   37	      variants: Array.isArray(row.variants)
   38	        ? (row.variants as Array<{ name: string; value: string; price: number | null }>)
   39	        : [],
   40	    }));
   41	
   42	    return new Response(
   43	      superjson.stringify({ products } satisfies OutputType),
   44	      { headers: { "Content-Type": "application/json" } },
   45	    );
   46	  } catch (error) {
   47	    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
   48	    return new Response(
   49	      superjson.stringify({
   50	        error: noBusiness ? "Create your business page first." : "Not authenticated",
   51	      }),
   52	      { status: noBusiness ? 400 : 401 },
   53	    );
   54	  }
   55	}
