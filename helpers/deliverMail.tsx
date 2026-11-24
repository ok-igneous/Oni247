import { decryptSecret } from "./mailCrypto";
import { platformSenderReady } from "./emailConfig";
import { sendMany, type MailMessage, type MailProvider, type SendResult } from "./mailProviders";
import { sendViaSmtp } from "./smtpSend";

export type MailSettingsRow = {
  provider: string;
  apiKeyEnc: string;
  extra: unknown;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
};

/**
 * Backend only. Sends through the shop's own provider, or through the app's own
 * SMTP server (see helpers/emailConfig). Nothing here depends on the hosting platform.
 */
export const deliverMail = async (row: MailSettingsRow | null, businessName: string, businessEmail: string | null, messages: MailMessage[]): Promise<SendResult[]> => {
  const provider = row?.provider ?? "platform";
  if (provider !== "platform") {
    if (!row) return messages.map(() => ({ ok: false, error: "Email settings are missing." }));
    const extra = (row.extra ?? {}) as Record<string, unknown>;
    const apiKey = await decryptSecret(row.apiKeyEnc);
    return sendMany(
      {
        provider: provider as MailProvider,
        apiKey,
        extra: {
          mailgunDomain: typeof extra.mailgunDomain === "string" ? extra.mailgunDomain : undefined,
          mailgunRegion: extra.mailgunRegion === "eu" ? "eu" : "us",
        },
      },
      messages,
    );
  }

  if (!(await platformSenderReady())) {
    return messages.map(() => ({ ok: false, error: "The app's email server is not set up yet. Connect your own email provider in Email settings." }));
  }
  const senderName = (row?.fromName || businessName).replace(/["<>\r\n]/g, "").trim() || "Oni247";
  const replyTo = row?.replyTo || businessEmail || undefined;
  return sendViaSmtp(
    messages.map((m) => ({
      fromName: senderName,
      to: m.to,
      replyTo,
      subject: m.subject,
      html: m.html,
      text: m.text,
      headers: m.headers,
    })),
  );
};
   55