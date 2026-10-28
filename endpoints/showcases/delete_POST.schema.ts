import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({ id: z.string().uuid() });

export type InputType = z.infer<typeof schema>;

export type OutputType = { deleted: true };

   10	export const postDeleteShowcase = async (
   11	  body: InputType,
   12	  init?: RequestInit,
   13	): Promise<OutputType> => {
   14	  const validatedInput = schema.parse(body);
   15	  const result = await fetch(`/_api/showcases/delete`, {
   16	    method: "POST",
   17	    body: superjson.stringify(validatedInput),
   18	    ...init,
   19	    headers: {
   20	      "Content-Type": "application/json",
   21	      ...(init?.headers ?? {}),
   22	    },
   23	  });
   24	  if (!result.ok) {
   25	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   26	    throw new Error(errorObject.error);
   27	  }
   28	  return superjson.parse<OutputType>(await result.text());
   29	};
