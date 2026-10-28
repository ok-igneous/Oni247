import { z } from "zod";
import superjson from "superjson";
import type { StorefrontProduct } from "./storefront_GET.schema";

export const schema = z.object({
  code: z
    .string()
    .trim()
    .min(4)
   10	    .max(16)
   11	    .transform((value) => value.toUpperCase()),
   12	});
   13	
   14	export type InputType = z.infer<typeof schema>;
   15	
   16	export type OutputType = {
   17	  showcase: { title: string; description: string | null; code: string };
   18	  business: {
   19	    name: string;
   20	    slug: string;
   21	    logoUrl: string | null;
   22	    phone: string | null;
   23	    whatsappNumber: string | null;
   24	    currency: string;
   25	  };
   26	  products: StorefrontProduct[];
   27	};
   28	
   29	export const getShowcase = async (
   30	  query: InputType,
   31	  init?: RequestInit,
   32	): Promise<OutputType> => {
   33	  const validated = schema.parse(query);
   34	  const params = new URLSearchParams({ code: validated.code });
   35	  const result = await fetch(`/_api/showcase?${params.toString()}`, {
   36	    method: "GET",
   37	    ...init,
   38	    headers: {
   39	      "Content-Type": "application/json",
   40	      ...(init?.headers ?? {}),
   41	    },
   42	  });
   43	  if (!result.ok) {
   44	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   45	    throw new Error(errorObject.error);
   46	  }
   47	  return superjson.parse<OutputType>(await result.text());
   48	};
