import { z } from "zod";
import superjson from "superjson";
import { BusinessStatusArrayValues } from "../../helpers/schema";

export const schema = z.object({
  businessId: z.string().uuid(),
  status: z.enum(BusinessStatusArrayValues),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = { updated: true };

export const postAdminSetStatus = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/admin/setStatus`, {
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
