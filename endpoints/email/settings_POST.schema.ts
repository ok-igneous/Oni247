import { z } from "zod";
import superjson from "superjson";

export const templateSchema = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour"),
  showLogo: z.boolean(),
  greeting: z.enum(["first_name", "hello", "none"]),
  signature: z.string().trim().max(300),
  footerNote: z.string().trim().max(300),
  showAddress: z.boolean(),
  showPhone: z.boolean(),
  showWhatsapp: z.boolean(),
  showWebsite: z.boolean(),
  buttonLabel: z.string().trim().max(40),
  buttonUrl: z.union([z.literal(""), z.string().trim().url("Enter a full link starting with https://").max(500)]),
  preheader: z.string().trim().max(120),
});

export const schema = z.object({
  provider: z.enum(["platform", "resend", "brevo", "sendgrid", "mailgun"]),
  apiKey: z.string().trim().max(500).optional(),
  fromName: z.string().trim().min(1, "Add a sender name").max(80),
  fromEmail: z.string().trim().max(200).optional(),
  replyTo: z.union([z.literal(""), z.string().trim().email("Enter a valid reply-to email").max(200)]).optional(),
  mailgunDomain: z.string().trim().max(200).optional(),
  mailgunRegion: z.enum(["us", "eu"]).optional(),
  template: templateSchema.optional(),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { saved: true };

export const postEmailSettings = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/email/settings`, {
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
