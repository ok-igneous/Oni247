import { z } from "zod";
import superjson from "superjson";
import {
  OrderStatusArrayValues,
  ShippingStatusArrayValues,
} from "../../helpers/schema";

export const schema = z.object({
  id: z.string().uuid(),
   10	  status: z.enum(OrderStatusArrayValues).optional(),
   11	  shippingStatus: z.enum(ShippingStatusArrayValues).optional(),
   12	  ownerNote: z
   13	    .string()
   14	    .trim()
   15	    .max(500)
   16	    .nullish()
   17	    .transform((value) => (value && value.length > 0 ? value : null))
   18	    .optional(),
   19	  deliveryAddress: z
   20	    .string()
   21	    .trim()
   22	    .max(200)
   23	    .nullish()
   24	    .transform((value) => (value && value.length > 0 ? value : null))
   25	    .optional(),
   26	});
   27	
   28	export type InputType = z.infer<typeof schema>;
   29	
   30	export type OutputType = { updated: true };
   31	
   32	export const postUpdateOrder = async (
   33	  body: InputType,
   34	  init?: RequestInit,
   35	): Promise<OutputType> => {
   36	  const validatedInput = schema.parse(body);
   37	  const result = await fetch(`/_api/orders/update`, {
   38	    method: "POST",
   39	    body: superjson.stringify(validatedInput),
   40	    ...init,
   41	    headers: {
   42	      "Content-Type": "application/json",
   43	      ...(init?.headers ?? {}),
   44	    },
   45	  });
   46	  if (!result.ok) {
   47	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   48	    throw new Error(errorObject.error);
   49	  }
   50	  return superjson.parse<OutputType>(await result.text());
   51	};
