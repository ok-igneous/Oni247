import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  customerName: z.string().trim().min(1, "Enter the customer's name").max(80),
  customerPhone: z
    .string()
    .trim()
    .max(30)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null)),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .min(1, "Add at least one item")
    .max(50),
  deliveryAddress: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null)),
  markCompleted: z.boolean(),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  orderId: string;
  trackingCode: string | null;
  total: number;
  currency: string;
};

export const postCreateOrder = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/orders/create`, {
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
