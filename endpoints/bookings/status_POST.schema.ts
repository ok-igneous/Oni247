import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({ slug: z.string().min(1).max(120), code: z.string().trim().min(4).max(20) });
export type InputType = z.infer<typeof schema>;
export type OutputType = {
  code: string;
  serviceName: string;
  businessName: string;
  businessSlug: string;
  status: string;
  paymentStatus: string;
  checkoutMode: string;
  amountDue: number;
  amountTotal: number;
  currency: string;
  preferredDate: string | null;
  preferredTime: string | null;
  createdAt: Date;
  canPay: boolean;
};

export const postBookingStatus = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/bookings/status`, {
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
