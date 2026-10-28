import { z } from "zod";
import superjson from "superjson";
import type { Selectable } from "kysely";
import type { Categories } from "../../helpers/schema";

export const schema = z.object({
  id: z.string().uuid().nullish(),
  name: z.string().trim().min(1, "Give the category a name").max(60),
  description: z
   10	    .string()
   11	    .trim()
   12	    .max(300)
   13	    .nullish()
   14	    .transform((value) => (value && value.length > 0 ? value : null)),
   15	  sortOrder: z.number().int().min(0).max(9999),
   16	});
   17	
   18	export type InputType = z.infer<typeof schema>;
   19	
   20	export type OutputType = {
   21	  category: Selectable<Categories>;
   22	};
   23	
   24	export const postSaveCategory = async (
   25	  body: InputType,
   26	  init?: RequestInit,
   27	): Promise<OutputType> => {
   28	  const validatedInput = schema.parse(body);
   29	  const result = await fetch(`/_api/categories/save`, {
   30	    method: "POST",
   31	    body: superjson.stringify(validatedInput),
   32	    ...init,
   33	    headers: {
   34	      "Content-Type": "application/json",
   35	      ...(init?.headers ?? {}),
   36	    },
   37	  });
   38	  if (!result.ok) {
   39	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   40	    throw new Error(errorObject.error);
   41	  }
   42	  return superjson.parse<OutputType>(await result.text());
   43	};
