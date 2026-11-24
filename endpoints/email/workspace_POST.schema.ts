import { z } from "zod";
import superjson from "superjson";
import { templateSchema } from "./settings_POST.schema";
import { personSchema } from "./send_POST.schema";

const id = z.string().uuid();
const look = templateSchema.partial().nullable().optional();

export const schema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("draft.save"),
    id: id.optional(),
    subject: z.string().trim().max(150),
    message: z.string().max(5000),
    recipients: z.object({ people: z.array(personSchema).max(200), manual: z.string().max(5000) }),
    look,
  }),
  z.object({ op: z.literal("draft.delete"), id }),
  z.object({
    op: z.literal("template.save"),
    id: id.optional(),
    name: z.string().trim().min(1, "Give the template a name").max(80),
    subject: z.string().trim().max(150),
    message: z.string().max(5000),
    look,
  }),
  z.object({ op: z.literal("template.delete"), id }),
  z.object({
    op: z.literal("automation.save"),
    trigger: z.enum(["order_received", "registration_received", "registration_approved", "registration_declined", "booking_received", "booking_confirmed"]),
    enabled: z.boolean(),
    subject: z.string().trim().min(1, "Add a subject").max(150),
    message: z.string().trim().min(1, "Write the message").max(5000),
  }),
  z.object({
    op: z.literal("contact.save"),
    email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
    name: z.string().trim().max(120),
    phone: z.string().trim().max(40).optional(),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({ op: z.literal("contact.delete"), id }),
  z.object({ op: z.literal("contact.import"), text: z.string().max(60000) }),
  z.object({ op: z.literal("inbox.read"), id, read: z.boolean() }),
  z.object({ op: z.literal("inbox.delete"), id }),
]);

export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true; id?: string; imported?: number };

export const postEmailWorkspace = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/email/workspace`, {
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
