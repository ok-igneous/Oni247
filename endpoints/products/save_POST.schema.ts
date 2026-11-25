import { z } from "zod";
import superjson from "superjson";
import type { OwnerProduct } from "./list_GET.schema";

export const schema = z.object({
  id: z.string().uuid().nullish(),
  categoryId: z.string().uuid().nullish(),
  name: z.string().trim().min(1, "Give the product a name").max(120),
  description: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null)),
  price: z.number().min(0).max(999999999),
  costPrice: z.number().min(0).max(999999999).nullable().optional(),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null)),
  available: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
  unit: z.string().trim().max(40).nullish().transform((value) => (value && value.length > 0 ? value : null)),
  variants: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(80),
    price: z.number().min(0).max(999999999).nullable().optional(),
  })).max(100).optional(),
  // New fields are optional so an older app that omits them never wipes them.
  stockQuantity: z.number().int().min(0).max(1000000).nullable().optional(),
  images: z.array(z.string().trim().min(1).max(500)).max(8).optional(),
  compareAtPrice: z.number().min(0).max(999999999).nullable().optional(),
}).superRefine((value, ctx) => {
  const seen = new Set<string>();
  for (const [index, option] of (value.variants ?? []).entries()) {
    // The checkout resolver selects an option by group name and value. Reject
    // duplicate pairs (including case-only duplicates) instead of making the
    // charged price depend on which duplicate happens to appear first.
    const key = `${option.name.trim().toLocaleLowerCase()}\\u0000${option.value.trim().toLocaleLowerCase()}`;
    if (seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variants", index],
        message: "Each option value must be unique within its option group.",
      });
    }
    seen.add(key);
  }
});

export type InputType = z.infer<typeof schema>;

export type OutputType = { product: OwnerProduct };

export const postSaveProduct = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/products/save`, {
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
