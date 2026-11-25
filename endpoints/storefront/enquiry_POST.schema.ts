import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  slug: z.string().min(1).max(120),
  customerName: z.string().trim().min(1, "Enter your name").max(80),
  customerPhone: z
    .string()
    .trim()
    .max(30)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null)),
  customerEmail: z
    .string()
    .trim()
    .max(120)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null)),
  message: z.string().trim().min(2, "Write your message").max(1000),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = { sent: true };

export const postStorefrontEnquiry = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/storefront/enquiry`, {
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
