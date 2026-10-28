import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  txRef: z.string().min(4).max(120),
  transactionId: z.string().min(1).max(60),
});

export type InputType = z.infer<typeof schema>;
   10	
   11	export type OutputType = { activated: boolean; message: string };
   12	
   13	export const postVerifySubscription = async (
   14	  body: InputType,
   15	  init?: RequestInit,
   16	): Promise<OutputType> => {
   17	  const validatedInput = schema.parse(body);
   18	  const result = await fetch(`/_api/subscription/verify`, {
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
