import superjson from "superjson";
import { z } from "zod";

export const schema = z.object({
  websitePlan: z.string().min(1).max(60),
  durationMonths: z.number().int().min(1).max(60),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = { paymentLink: string; txRef: string };

export const postSubscriptionCheckout = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/subscription/checkout`, {
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
