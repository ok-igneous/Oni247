import { z } from "zod";
import superjson from "superjson";

export const schema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("save"),
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1, "Give the link a title.").max(80),
    description: z.string().trim().max(300),
    /** null: the payer chooses the amount. */
    amount: z.number().finite().positive().max(100_000_000).nullable(),
    active: z.boolean(),
  }),
  z.object({ op: z.literal("delete"), id: z.string().uuid() }),
]);
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true };

export const postPaymentLink = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/payments/links`, { method: "POST", body: superjson.stringify(valid), ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
