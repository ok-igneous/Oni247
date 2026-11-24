import { z } from "zod";
import superjson from "superjson";

const id = z.string().uuid();
export const schema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("update"),
    id,
    status: z.enum(["requested", "confirmed", "completed", "cancelled"]).optional(),
    paymentStatus: z.enum(["unpaid", "paid", "refunded"]).optional(),
    ownerNote: z.string().trim().max(1000).optional(),
  }),
  z.object({ op: z.literal("refresh"), id }),
  z.object({ op: z.literal("delete"), id }),
]);
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true };

export const postUpdateBooking = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/bookings/update`, {
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
