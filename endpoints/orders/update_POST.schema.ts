import { z } from "zod";
import superjson from "superjson";
import {
  OrderPaymentStatusArrayValues,
  OrderStatusArrayValues,
  ShippingStatusArrayValues,
} from "../../helpers/schema";

export const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(OrderStatusArrayValues).optional(),
  shippingStatus: z.enum(ShippingStatusArrayValues).optional(),
  paymentStatus: z.enum(OrderPaymentStatusArrayValues).optional(),
  ownerNote: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null))
    .optional(),
  deliveryAddress: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null))
    .optional(),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = { updated: true };

export const postUpdateOrder = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/orders/update`, {
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
