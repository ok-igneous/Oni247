import { z } from "zod";
import superjson from "superjson";
import { EnquiryStatusArrayValues } from "../../helpers/schema";

export const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(EnquiryStatusArrayValues),
});

   10	export type InputType = z.infer<typeof schema>;
   11	
   12	export type OutputType = { updated: true };
   13	
   14	export const postEnquiryStatus = async (
   15	  body: InputType,
   16	  init?: RequestInit,
   17	): Promise<OutputType> => {
   18	  const validatedInput = schema.parse(body);
   19	  const result = await fetch(`/_api/enquiries/status`, {
   20	    method: "POST",
   21	    body: superjson.stringify(validatedInput),
   22	    ...init,
   23	    headers: {
   24	      "Content-Type": "application/json",
   25	      ...(init?.headers ?? {}),
   26	    },
   27	  });
   28	  if (!result.ok) {
   29	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   30	    throw new Error(errorObject.error);
   31	  }
   32	  return superjson.parse<OutputType>(await result.text());
   33	};