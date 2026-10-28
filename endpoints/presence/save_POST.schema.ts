import { z } from "zod";
import superjson from "superjson";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
   10	    .transform((value) => (value && value.length > 0 ? value : null));
   11	
   12	export const schema = z.discriminatedUnion("kind", [
   13	  z.object({
   14	    kind: z.literal("testimonial"),
   15	    id: z.string().uuid().nullish(),
   16	    authorName: z.string().trim().min(1, "Whose words are these?").max(80),
   17	    authorRole: optionalText(80),
   18	    quote: z.string().trim().min(4, "Add the testimonial").max(600),
   19	    rating: z.number().int().min(1).max(5).nullish(),
   20	    published: z.boolean(),
   21	    sortOrder: z.number().int().min(0).max(9999),
   22	  }),
   23	  z.object({
   24	    kind: z.literal("portfolio"),
   25	    id: z.string().uuid().nullish(),
   26	    title: z.string().trim().min(1, "Give the work a title").max(120),
   27	    description: optionalText(600),
   28	    imageUrl: optionalText(500),
   29	    linkUrl: optionalText(500),
   30	    sortOrder: z.number().int().min(0).max(9999),
   31	  }),
   32	]);
   33	
   34	export type InputType = z.infer<typeof schema>;
   35	
   36	export type OutputType = { saved: true };
   37	
   38	export const postSavePresence = async (
   39	  body: InputType,
   40	  init?: RequestInit,
   41	): Promise<OutputType> => {
   42	  const validatedInput = schema.parse(body);
   43	  const result = await fetch(`/_api/presence/save`, {
   44	    method: "POST",
   45	    body: superjson.stringify(validatedInput),
   46	    ...init,
   47	    headers: {
   48	      "Content-Type": "application/json",
   49	      ...(init?.headers ?? {}),
   50	    },
   51	  });
   52	  if (!result.ok) {
   53	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   54	    throw new Error(errorObject.error);
   55	  }
   56	  return superjson.parse<OutputType>(await result.text());
   57	};
