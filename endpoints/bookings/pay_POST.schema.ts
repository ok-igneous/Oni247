import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({ slug: z.string().min(1).max(120), code: z.string().trim().min(4).max(20) });
export type InputType = z.infer<typeof schema>;
export type OutputType = { paymentUrl: string };

export const postBookingPay = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/bookings/pay`, {
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
