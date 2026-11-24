import { platformSettings } from "./platformSettings";
import { decryptSecret } from "./mailCrypto";

/**
 * The app's own (default) email sender. Plain SMTP, so it works with any mail server or provider
 * (your own Postfix, Zoho, Brevo, Amazon SES, Mailgun SMTP, Google Workspace …) with no dependency on
 * any hosting platform. It is set up by the Oni247 admin under Admin → Settings → Email; environment
 * variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL, SMTP_SECURE, EMAIL_INBOX_DOMAIN,
 * EMAIL_INBOUND_SECRET) are used only when nothing has been saved there. Backend only.
 */
export type StoredSmtp = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  passEnc: string;
  fromEmail: string;
  fromName: string;
  inboxDomain: string;
  inboundSecretEnc: string;
};
export const SMTP_KEY = "smtp";

const env = (name: string) => ((process.env as Record<string, string | undefined>)[name] ?? "").trim();

export const smtpConfig = async () => {
  const stored = await platformSettings.get<StoredSmtp>(SMTP_KEY);
  if (stored?.host) {
    let pass = "";
    let inboundSecret = "";
    try {
      pass = stored.passEnc ? await decryptSecret(stored.passEnc) : "";
      inboundSecret = stored.inboundSecretEnc ? await decryptSecret(stored.inboundSecretEnc) : "";
    } catch {
      pass = "";
    }
    return {
      source: "admin" as const,
      host: stored.host,
      port: stored.port || 587,
      secure: Boolean(stored.secure),
      user: stored.user,
      pass,
      fromEmail: stored.fromEmail,
      fromName: stored.fromName || "Oni247",
      inboxDomain: stored.inboxDomain || "",
      inboundSecret,
    };
  }
  const port = Number.parseInt(env("SMTP_PORT") || "587", 10) || 587;
  const flag = env("SMTP_SECURE").toLowerCase();
  return {
    source: "env" as const,
    host: env("SMTP_HOST"),
    port,
    secure: flag ? flag === "true" || flag === "1" : port === 465,
    user: env("SMTP_USER"),
    pass: env("SMTP_PASS"),
    fromEmail: env("SMTP_FROM_EMAIL"),
    fromName: "Oni247",
    inboxDomain: env("EMAIL_INBOX_DOMAIN"),
    inboundSecret: env("EMAIL_INBOUND_SECRET"),
  };
};

export const emailSendingReady = async (): Promise<boolean> => {
  const c = await smtpConfig();
  return Boolean(c.host && c.user && c.pass && c.fromEmail);
};
export const platformSenderReady = emailSendingReady;

export const inboundSecret = async (): Promise<string> => (await smtpConfig()).inboundSecret;

/** Replies to the app's own emails arrive in the shop's Inbox at <shop-slug>@<domain>, once inbound forwarding is set up. */
export const inboxAddressFor = async (slug: string): Promise<string | null> => {
  const c = await smtpConfig();
  return c.inboxDomain && c.inboundSecret.length >= 16 ? `${slug}@${c.inboxDomain}` : null;
};

