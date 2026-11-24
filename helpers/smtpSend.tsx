import nodemailer from "nodemailer";
import { smtpConfig } from "./emailConfig";

export type SmtpMessage = {
  fromName: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};
export type SmtpResult = { ok: true } | { ok: false; error: string };

const friendly = (error: unknown): string => {
  const e = error as { code?: string; responseCode?: number; message?: string } | null;
  if (!e) return "Could not send the email.";
  if (e.code === "EAUTH" || e.responseCode === 535) return "The mail server rejected the username or password.";
  if (e.code === "ECONNECTION" || e.code === "ESOCKET" || e.code === "ETIMEDOUT" || e.code === "ECONNREFUSED" || e.code === "EDNS") return "Could not reach the mail server. Check the host and port.";
  if (e.responseCode && e.responseCode >= 500) return `The mail server refused this email (${e.responseCode}).`;
  return typeof e.message === "string" && e.message ? e.message.slice(0, 200) : "Could not send the email.";
};

/** Backend only. Sends through the app's own SMTP server. One connection is reused for a whole batch. */
export const sendViaSmtp = async (messages: SmtpMessage[]): Promise<SmtpResult[]> => {
  const c = await smtpConfig();
  if (!(c.host && c.user && c.pass && c.fromEmail)) {
    return messages.map(() => ({ ok: false, error: "The app's email server is not set up yet." }));
  }
  const transport = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user: c.user, pass: c.pass },
    pool: true,
    maxConnections: 3,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  const results: SmtpResult[] = new Array(messages.length);
  try {
    let next = 0;
    const worker = async () => {
      while (next < messages.length) {
        const i = next++;
        const m = messages[i];
        const name = m.fromName.replace(/["<>\r\n]/g, "").trim() || "Oni247";
        try {
          await transport.sendMail({
            from: { name, address: c.fromEmail },
            to: m.to,
            replyTo: m.replyTo || undefined,
            subject: m.subject,
            html: m.html,
            text: m.text,
            headers: m.headers,
          });
          results[i] = { ok: true };
        } catch (error) {
          results[i] = { ok: false, error: friendly(error) };
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, messages.length) }, worker));
  } finally {
    transport.close();
  }
  return results;
};

