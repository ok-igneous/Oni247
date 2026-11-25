import { z } from "zod";
import superjson from "superjson";
import type { Selectable } from "kysely";
import type { Businesses, Json } from "../../helpers/schema";
import {
  BusinessStatusArrayValues,
  StoreThemeArrayValues,
} from "../../helpers/schema";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null));

export const schema = z.object({
  name: z.string().trim().min(2, "Business name is too short").max(80),
  slug: z
    .string()
    .trim()
    .min(3, "Page address is too short")
    .max(60)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and hyphens only",
    ),
  description: optionalText(500),
  logoUrl: optionalText(500),
  heroHeadline: optionalText(120).optional(),
  heroSubtext: optionalText(300).optional(),
  heroImageUrl: optionalText(500).optional(),
  heroCtaLabel: optionalText(40).optional(),
  phone: optionalText(30),
  whatsappNumber: optionalText(30),
  email: optionalText(120),
  address: optionalText(200),
  openingHours: optionalText(120),
  themeId: z.enum(StoreThemeArrayValues),
  currency: z.string().trim().length(3).toUpperCase(),
  status: z.enum(BusinessStatusArrayValues),
  appearanceSettings: z.record(z.unknown()).transform((value) => value as Json).optional(),
  contentSettings: z.record(z.unknown()).transform((value) => value as Json).optional(),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  business: Selectable<Businesses>;
};

export const postSaveBusiness = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/business/save`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
