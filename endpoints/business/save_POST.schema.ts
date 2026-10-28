import { z } from "zod";
import superjson from "superjson";
import type { Selectable } from "kysely";
import type { Businesses, Json } from "../../helpers/schema";
import {
  BusinessStatusArrayValues,
  StoreThemeArrayValues,
} from "../../helpers/schema";

   10	const optionalText = (max: number) =>
   11	  z
   12	    .string()
   13	    .trim()
   14	    .max(max)
   15	    .nullish()
   16	    .transform((value) => (value && value.length > 0 ? value : null));
   17	
   18	export const schema = z.object({
   19	  name: z.string().trim().min(2, "Business name is too short").max(80),
   20	  slug: z
   21	    .string()
   22	    .trim()
   23	    .min(3, "Page address is too short")
   24	    .max(60)
   25	    .regex(
   26	      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
   27	      "Use lowercase letters, numbers and hyphens only",
   28	    ),
   29	  description: optionalText(500),
   30	  logoUrl: optionalText(500),
   31	  heroHeadline: optionalText(120).optional(),
   32	  heroSubtext: optionalText(300).optional(),
   33	  heroImageUrl: optionalText(500).optional(),
   34	  heroCtaLabel: optionalText(40).optional(),
   35	  phone: optionalText(30),
   36	  whatsappNumber: optionalText(30),
   37	  email: optionalText(120),
   38	  address: optionalText(200),
   39	  openingHours: optionalText(120),
   40	  themeId: z.enum(StoreThemeArrayValues),
   41	  currency: z.string().trim().length(3).toUpperCase(),
   42	  status: z.enum(BusinessStatusArrayValues),
   43	  appearanceSettings: z.record(z.unknown()).transform((value) => value as Json).optional(),
   44	  contentSettings: z.record(z.unknown()).transform((value) => value as Json).optional(),
   45	});
   46	
   47	export type InputType = z.infer<typeof schema>;
   48	
   49	export type OutputType = {
   50	  business: Selectable<Businesses>;
   51	};
   52	
   53	export const postSaveBusiness = async (
   54	  body: InputType,
   55	  init?: RequestInit,
   56	): Promise<OutputType> => {
   57	  const validatedInput = schema.parse(body);
   58	  const result = await fetch(`/_api/business/save`, {
   59	    method: "POST",
   60	    body: superjson.stringify(validatedInput),
   61	    ...init,
   62	    headers: {
   63	      "Content-Type": "application/json",
   64	      ...(init?.headers ?? {}),
   65	    },
   66	  });
   67	  if (!result.ok) {
   68	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   69	    throw new Error(errorObject.error);
   70	  }
   71	  return superjson.parse<OutputType>(await result.text());
   72	};
