import { z } from "zod";
import superjson from "superjson";

const provider = z.enum(["paystack", "flutterwave", "stripe"]);

export const schema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("save"), provider, secretKey: z.string().trim().max(300).optional() }),
  z.object({ op: z.literal("test"), provider }),
  z.object({ op: z.literal("enable"), provider, enabled: z.boolean() }),
  z.object({ op: z.literal("remove"), provider }),
]);
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true };

export const postGateway = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/payments/gateways`, {
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
