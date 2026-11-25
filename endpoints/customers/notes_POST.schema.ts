import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  id: z.string().uuid(),
  notes: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type InputType = z.input<typeof schema>;

export type OutputType = { updated: true };

export const postCustomerNotes = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/customers/notes`, {
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
