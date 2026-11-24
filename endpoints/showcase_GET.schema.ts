import { z } from "zod";
import superjson from "superjson";
import type { StorefrontProduct } from "./storefront_GET.schema";

export const schema = z.object({
  code: z
    .string()
    .trim()
    .min(4)
    .max(16)
    .transform((value) => value.toUpperCase()),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  showcase: { title: string; description: string | null; code: string };
  business: {
    name: string;
    slug: string;
    logoUrl: string | null;
    phone: string | null;
    whatsappNumber: string | null;
    currency: string;
  };
  products: StorefrontProduct[];
};

export const getShowcase = async (
  query: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validated = schema.parse(query);
  const params = new URLSearchParams({ code: validated.code });
  const result = await fetch(`/_api/showcase?${params.toString()}`, {
    method: "GET",
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
