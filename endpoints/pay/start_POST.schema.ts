import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  code: z.string().trim().min(4).max(20),
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  phone: z.string().trim().max(30).optional(),
  /** Only used when the link lets the payer choose the amount. */
  amount: z.number().finite().positive().max(100_000_000).optional(),
});
export type InputType = z.infer<typeof schema>;
export type OutputType = { url: string };

export const postPayStart = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/pay/start`, { method: "POST", body: superjson.stringify(valid), ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};