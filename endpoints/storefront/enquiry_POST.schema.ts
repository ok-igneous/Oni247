import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  slug: z.string().min(1).max(120),
  customerName: z.string().trim().min(1, "Enter your name").max(80),
  customerPhone: z
    .string()
    .trim()
   10	    .max(30)
   11	    .nullish()
   12	    .transform((value) => (value && value.length > 0 ? value : null)),
   13	  customerEmail: z
   14	    .string()
   15	    .trim()
   16	    .max(120)
   17	    .nullish()
   18	    .transform((value) => (value && value.length > 0 ? value : null)),
   19	  message: z.string().trim().min(2, "Write your message").max(1000),
   20	});
   21	
   22	export type InputType = z.infer<typeof schema>;
   23	
   24	export type OutputType = { sent: true };
   25	
   26	export const postStorefrontEnquiry = async (
   27	  body: InputType,
   28	  init?: RequestInit,
   29	): Promise<OutputType> => {
   30	  const validatedInput = schema.parse(body);
   31	  const result = await fetch(`/_api/storefront/enquiry`, {
   32	    method: "POST",
   33	    body: superjson.stringify(validatedInput),
   34	    ...init,
   35	    headers: {
   36	      "Content-Type": "application/json",
   37	      ...(init?.headers ?? {}),
   38	    },
   39	  });
   40	  if (!result.ok) {
   41	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   42	    throw new Error(errorObject.error);
   43	  }
   44	  return superjson.parse<OutputType>(await result.text());
   45	};
