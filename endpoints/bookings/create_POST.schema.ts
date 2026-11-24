import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  slug: z.string().min(1).max(120),
  serviceId: z.string().min(1).max(100),
  name: z.string().trim().min(2, "Enter your name").max(120),
  phone: z.string().trim().max(40).optional(),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email").max(200)]).optional(),
  date: z.string().trim().max(40).optional(),
  time: z.string().trim().max(40).optional(),
  location: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(1000).optional(),
  payOnline: z.boolean(),
});
export type InputType = z.infer<typeof schema>;
export type OutputType = { code: string; paymentUrl: string | null; message: string | null };

export const postCreateBooking = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/bookings/create`, {
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
