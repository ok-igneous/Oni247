import superjson from "superjson";
import { z } from "zod";

export const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "approved", "declined"]),
});

export type InputType = z.infer<typeof schema>;

export const postSubmissionStatus = async (body: InputType, init?: RequestInit): Promise<{ saved: true }> => {
  const validated = schema.parse(body);
  const result = await fetch("/_api/forms/submissionStatus", {
    method: "POST",
    body: superjson.stringify(validated),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<{ saved: true }>(await result.text());
};

