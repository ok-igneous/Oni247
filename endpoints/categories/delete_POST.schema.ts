import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  id: z.string().uuid(),
});

export type InputType = z.infer<typeof schema>;

   10	export type OutputType = { deleted: true };
   11	
   12	export const postDeleteCategory = async (
   13	  body: InputType,
   14	  init?: RequestInit,
   15	): Promise<OutputType> => {
   16	  const validatedInput = schema.parse(body);
   17	  const result = await fetch(`/_api/categories/delete`, {
   18	    method: "POST",
   19	    body: superjson.stringify(validatedInput),
   20	    ...init,
   21	    headers: {
   22	      "Content-Type": "application/json",
   23	      ...(init?.headers ?? {}),
   24	    },
   25	  });
   26	  if (!result.ok) {
   27	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   28	    throw new Error(errorObject.error);
   29	  }
   30	  return superjson.parse<OutputType>(await result.text());
   31	};
