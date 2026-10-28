import superjson from "superjson";

export type OwnerProduct = {
  id: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
   10	  costPrice: number | null;
   11	  currency: string;
   12	  imageUrl: string | null;
   13	  available: boolean;
   14	  featured: boolean;
   15	  sortOrder: number;
   16	  unit: string | null;
   17	  variants: Array<{ name: string; value: string; price: number | null }>;
   18	};
   19	
   20	export type OutputType = {
   21	  products: OwnerProduct[];
   22	};
   23	
   24	export const getProducts = async (init?: RequestInit): Promise<OutputType> => {
   25	  const result = await fetch(`/_api/products/list`, {
   26	    method: "GET",
   27	    ...init,
   28	    headers: {
   29	      "Content-Type": "application/json",
   30	      ...(init?.headers ?? {}),
   31	    },
   32	  });
   33	  if (!result.ok) {
   34	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   35	    throw new Error(errorObject.error);
   36	  }
   37	  return superjson.parse<OutputType>(await result.text());
   38	};
