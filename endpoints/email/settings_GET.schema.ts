import superjson from "superjson";
import type { MailProvider } from "../../helpers/mailProviders";
import type { EmailTemplate } from "../../helpers/emailTemplate";

export type OutputType = {
  serverReady: boolean;
  isPremiumPlus: boolean;
  configured: boolean;
  /** "platform" is the app's own sender, used until an owner connects a provider. */
  provider: MailProvider | null;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  mailgunDomain: string;
  mailgunRegion: "us" | "eu";
  hasKey: boolean;
  verified: boolean;
  lastError: string | null;
  webhookUrl: string | null;
  /** Additive: whether the app's own sender is switched on. */
  platformReady?: boolean;
  /** Additive: the look and business details attached to every email. */
  template?: EmailTemplate;
  /** Additive: business details used in the email header and footer. */
  business?: { name: string; slug: string; logoUrl: string | null; address: string | null; phone: string | null; whatsappNumber: string | null; email: string | null };
};

export const getEmailSettings = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/email/settings`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
