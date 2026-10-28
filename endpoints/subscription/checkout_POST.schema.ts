import superjson from "superjson";
import { z } from "zod";

export const schema = z.object({
  websitePlan: z.enum(["one_page", "premium_plus"]),
  durationMonths: z.number().int().min(1).max(24),
});

export type InputType = z.infer<typeof schema>;
   10	
   11	export type OutputType = { paymentLink: string; txRef: string };
   12	
   13	export const postSubscriptionCheckout = async (
   14	  body: InputType,
   15	  init?: RequestInit,
   16	): Promise<OutputType> => {
   17	  const validatedInput = schema.parse(body);
   18	  const result = await fetch(`/_api/subscription/checkout`, {
   19	    method: "POST",
   20	    body: superjson.stringify(validatedInput),
   21	    ...init,
   22	    headers: {
   23	      "Content-Type": "application/json",
   24	      ...(init?.headers ?? {}),
   25	    },
   26	  });
   27	  if (!result.ok) {
   28	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   29	    throw new Error(errorObject.error);
   30	  }
   31	  return superjson.parse<OutputType>(await result.text());
   32	};
