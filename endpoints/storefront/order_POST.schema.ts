import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  slug: z.string().min(1).max(120),
  customerName: z.string().trim().min(1, "Enter your name").max(80),
  customerPhone: z.string().trim().min(4, "Enter your phone number").max(30),
  items: z
    .array(
   10	      z.object({
   11	        productId: z.string().uuid(),
   12	        quantity: z.number().int().min(1).max(999),
   13	      }),
   14	    )
   15	    .min(1)
   16	    .max(50),
   17	  deliveryAddress: z
   18	    .string()
   19	    .trim()
   20	    .max(200)
   21	    .nullish()
   22	    .transform((value) => (value && value.length > 0 ? value : null)),
   23	});
   24	
   25	export type InputType = z.infer<typeof schema>;
   26	
   27	export type OutputType = {
   28	  orderId: string;
   29	  trackingCode: string | null;
   30	  total: number;
   31	  currency: string;
   32	};
   33	
   34	export const postStorefrontOrder = async (
   35	  body: InputType,
   36	  init?: RequestInit,
   37	): Promise<OutputType> => {
   38	  const validatedInput = schema.parse(body);
   39	  const result = await fetch(`/_api/storefront/order`, {
   40	    method: "POST",
   41	    body: superjson.stringify(validatedInput),
   42	    ...init,
   43	    headers: {
   44	      "Content-Type": "application/json",
   45	      ...(init?.headers ?? {}),
   46	    },
   47	  });
   48	  if (!result.ok) {
   49	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   50	    throw new Error(errorObject.error);
   51	  }
   52	  return superjson.parse<OutputType>(await result.text());
   53	};
