import { z } from "zod";
import superjson from "superjson";
import { templateSchema } from "./settings_POST.schema";

export const personSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: z.string().trim().max(120),
});

export const schema = z.object({
  audience: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("customers") }),
    z.object({ kind: z.literal("event"), eventId: z.string().uuid(), approvedOnly: z.boolean() }),
    // Chosen people: picked customers, participants and contacts, plus typed emails.
    z.object({ kind: z.literal("list"), people: z.array(personSchema).min(1, "Choose who to send to").max(200) }),
  ]),
  subject: z.string().trim().min(1, "Add a subject").max(150),
  message: z.string().trim().min(1, "Write your message").max(5000),
  /** Optional look for this email only, instead of the defaults. */
  look: templateSchema.partial().optional(),
  /** A draft to remove once the email has gone. */
  draftId: z.string().uuid().optional(),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { recipients: number; sent: number; failed: number; skippedOptedOut: number };

export const postSendEmail = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/email/send`, {
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
