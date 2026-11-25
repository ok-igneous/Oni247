import { z } from "zod";
import superjson from "superjson";
import type { OwnerShowcase } from "./list_GET.schema";

export const schema = z.object({
  id: z.string().uuid().nullish(),
  title: z.string().trim().min(1, "Give the collection a title").max(80),
  description: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null)),
  productIds: z
    .array(z.string().uuid())
    .min(1, "Pick at least one product")
    .max(40),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = { showcase: OwnerShowcase };

export const postSaveShowcase = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/showcases/save`, {
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
