import { z } from "zod";
import superjson from "superjson";
import type { OwnerProduct } from "./list_GET.schema";

export const schema = z.object({
  id: z.string().uuid().nullish(),
  categoryId: z.string().uuid().nullish(),
  name: z.string().trim().min(1, "Give the product a name").max(120),
  description: z
   10	    .string()
   11	    .trim()
   12	    .max(1000)
   13	    .nullish()
   14	    .transform((value) => (value && value.length > 0 ? value : null)),
   15	  price: z.number().min(0).max(999999999),
   16	  costPrice: z.number().min(0).max(999999999).nullable().optional(),
   17	  imageUrl: z
   18	    .string()
   19	    .trim()
   20	    .max(500)
   21	    .nullish()
   22	    .transform((value) => (value && value.length > 0 ? value : null)),
   23	  available: z.boolean(),
   24	  featured: z.boolean(),
   25	  sortOrder: z.number().int().min(0).max(9999),
   26	  unit: z.string().trim().max(40).nullish().transform((value) => (value && value.length > 0 ? value : null)),
   27	  variants: z.array(z.object({
   28	    name: z.string().trim().min(1).max(80),
   29	    value: z.string().trim().min(1).max(80),
   30	    price: z.number().min(0).max(999999999).nullable().optional(),
   31	  })).max(100).optional(),
   32	});
   33	
   34	export type InputType = z.infer<typeof schema>;
   35	
   36	export type OutputType = { product: OwnerProduct };
   37	
   38	export const postSaveProduct = async (
   39	  body: InputType,
   40	  init?: RequestInit,
   41	): Promise<OutputType> => {
   42	  const validatedInput = schema.parse(body);
   43	  const result = await fetch(`/_api/products/save`, {
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
