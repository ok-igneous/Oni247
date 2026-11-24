import { z } from "zod";
import superjson from "superjson";
import {
  OrderPaymentMethodArrayValues,
  type OrderPaymentMethod,
} from "../../helpers/schema";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null));

export const schema = z.object({
  slug: z.string().min(1).max(120),
  customerName: z.string().trim().min(1, "Enter your name").max(80),
  customerPhone: z.string().trim().min(4, "Enter your phone number").max(30),
  customerEmail: optionalText(120),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(999),
        /** Chosen options, e.g. [{name:"Size",value:"L"}]. Omitted by older clients. */
        variants: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(80),
              value: z.string().trim().min(1).max(80),
            }),
          )
          .max(10)
          .optional(),
      }),
    )
    .min(1)
    .max(50),
  deliveryAddress: optionalText(200),
  /** Omitted by older clients, which get the old behaviour (no fee, no payment choice). */
  deliveryMethod: z.enum(["delivery", "pickup"]).optional(),
  deliveryZone: optionalText(80),
  paymentMethod: z.enum(OrderPaymentMethodArrayValues).nullish(),
  customerNote: optionalText(500),
});

export type InputType = z.infer<typeof schema>;

export type OrderConfirmationLine = {
  name: string;
  variantLabel: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OutputType = {
  orderId: string;
  /** Tracking code, only when the shop's plan includes tracking links. */
  trackingCode: string | null;
  /** Always present: the reference to quote to the shop. */
  orderRef: string;
  /** Items total plus delivery fee. */
  total: number;
  subtotal: number;
  deliveryFee: number;
  deliveryZone: string | null;
  paymentMethod: OrderPaymentMethod | null;
  /** Only returned when the customer chose bank transfer. */
  bank: { bankName: string; accountName: string; accountNumber: string } | null;
  lines: OrderConfirmationLine[];
  currency: string;
  /** Set for online payments: where to send the customer to pay. Older clients ignore it. */
  paymentUrl?: string | null;
  /** Why the payment page could not be opened. The order exists; the customer can retry. */
  paymentError?: string | null;
};

export const postStorefrontOrder = async (
  body: z.input<typeof schema>,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/storefront/order`, {
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

