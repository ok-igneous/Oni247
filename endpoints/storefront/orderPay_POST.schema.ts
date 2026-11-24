import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  slug: z.string().min(1).max(120),
  ref: z.string().trim().min(4).max(20),
  /** "check" asks the gateway whether the money arrived; "start" opens a fresh payment page. */
  op: z.enum(["start", "check"]),
});
export type InputType = z.infer<typeof schema>;

export type OutputType = {
  orderRef: string;
  paymentStatus: "paid" | "unpaid" | "failed";
  paymentUrl: string | null;
  total: number;
  currency: string;
  businessName: string;
};

export const postStorefrontOrderPay = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/storefront/orderPay`, {
    method: "POST",
    body: superjson.stringify(valid),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};

