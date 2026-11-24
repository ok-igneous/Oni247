import { z } from "zod";
import superjson from "superjson";
import type { CheckoutSettings } from "../../helpers/parseCheckoutSettings";

const money = z.number().min(0).max(999999999);

export const schema = z.object({
  deliveryEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  pickupNote: z.string().trim().max(200),
  zones: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(60),
        name: z.string().trim().min(1, "Give each delivery area a name").max(80),
        fee: money,
      }),
    )
    .max(40),
  freeDeliveryOver: money.nullable(),
  deliveryNote: z.string().trim().max(200),
  returnPolicy: z.string().trim().max(600),
  paymentMethods: z.object({
    cashOnDelivery: z.boolean(),
    bankTransfer: z.boolean(),
    payOnPickup: z.boolean(),
  }),
  bank: z.object({
    bankName: z.string().trim().max(80),
    accountName: z.string().trim().max(120),
    accountNumber: z.string().trim().max(30),
  }),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = { settings: CheckoutSettings };

export const postCheckoutSettings = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/business/checkoutSettings`, {
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
