import { z } from "zod";
import superjson from "superjson";
import type { OwnerShowcase } from "./list_GET.schema";

export const schema = z.object({
  id: z.string().uuid().nullish(),
  title: z.string().trim().min(1, "Give the collection a title").max(80),
  description: z
    .string()
   10	    .trim()
   11	    .max(300)
   12	    .nullish()
   13	    .transform((value) => (value && value.length > 0 ? value : null)),
   14	  productIds: z
   15	    .array(z.string().uuid())
   16	    .min(1, "Pick at least one product")
   17	    .max(40),
   18	});
   19	
   20	export type InputType = z.infer<typeof schema>;
   21	
   22	export type OutputType = { showcase: OwnerShowcase };
   23	
   24	export const postSaveShowcase = async (
   25	  body: InputType,
   26	  init?: RequestInit,
   27	): Promise<OutputType> => {
   28	  const validatedInput = schema.parse(body);
   29	  const result = await fetch(`/_api/showcases/save`, {
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