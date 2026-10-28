import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  customerName: z.string().trim().min(1, "Enter the customer's name").max(80),
  customerPhone: z
    .string()
    .trim()
    .max(30)
   10	    .nullish()
   11	    .transform((value) => (value && value.length > 0 ? value : null)),
   12	  items: z
   13	    .array(
   14	      z.object({
   15	        productId: z.string().uuid(),
   16	        quantity: z.number().int().min(1).max(999),
   17	      }),
   18	    )
   19	    .min(1, "Add at least one item")
   20	    .max(50),
   21	  deliveryAddress: z
   22	    .string()
   23	    .trim()
   24	    .max(200)
   25	    .nullish()
   26	    .transform((value) => (value && value.length > 0 ? value : null)),
   27	  markCompleted: z.boolean(),
   28	});
   29	
   30	export type InputType = z.infer<typeof schema>;
   31	
   32	export type OutputType = {
   33	  orderId: string;
   34	  trackingCode: string | null;
   35	  total: number;
   36	  currency: string;
   37	};
   38	
   39	export const postCreateOrder = async (
   40	  body: InputType,
   41	  init?: RequestInit,
   42	): Promise<OutputType> => {
   43	  const validatedInput = schema.parse(body);
   44	  const result = await fetch(`/_api/orders/create`, {
   45	    method: "POST",
   46	    body: superjson.stringify(validatedInput),
   47	    ...init,
   48	    headers: {
   49	      "Content-Type": "application/json",
   50	      ...(init?.headers ?? {}),
   51	    },
   52	  });
   53	  if (!result.ok) {
   54	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   55	    throw new Error(errorObject.error);
   56	  }
   57	  return superjson.parse<OutputType>(await result.text());
   58	};
