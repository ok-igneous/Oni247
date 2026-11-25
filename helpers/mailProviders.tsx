/**
 * Mail provider layer. Each shop sends through its OWN account with one of the
 * providers below, so mail goes out under the shop's own sender and reputation.
 * To add a provider (or plug in your own mail service), add it to PROVIDERS,
 * to `sendMail`, and, if it reports bounces, to `parseWebhook`.
 */
export type MailProvider = "platform" | "resend" | "brevo" | "sendgrid" | "mailgun";

export const PROVIDERS: Array<{ id: Exclude<MailProvider, "platform">; name: string; help: string }> = [
  { id: "resend", name: "Resend", help: "Create an API key in Resend and verify your sending domain there." },
  { id: "brevo", name: "Brevo", help: "Create an API key (v3) in Brevo and add your sender address there." },
  { id: "sendgrid", name: "SendGrid", help: "Create an API key with Mail Send permission and verify your sender in SendGrid." },
  { id: "mailgun", name: "Mailgun", help: "Use your Mailgun private API key and the domain you verified in Mailgun." },
];

export type MailConfig = {
  provider: MailProvider;
  apiKey: string;
  extra: { mailgunDomain?: string; mailgunRegion?: "us" | "eu" };
};

export type MailMessage = {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

export type SendResult = { ok: true } | { ok: false; error: string };

const clip = (s: string) => s.replace(/\s+/g, " ").slice(0, 200);
const rejected = (status: number, body: string): SendResult => ({
  ok: false,
  error:
    status === 401 || status === 403
      ? "The provider rejected the API key or the sender address. Check both in your provider account."
      : `The provider refused the email (${status}). ${clip(body)}`.trim(),
});

const post = async (url: string, init: RequestInit): Promise<{ status: number; ok: boolean; body: string }> => {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  return { status: res.status, ok: res.ok, body: await res.text() };
};

export const sendMail = async (cfg: MailConfig, m: MailMessage): Promise<SendResult> => {
  try {
    const from = `${m.fromName.replace(/["<>\r\n]/g, "")} <${m.fromEmail}>`;
    if (cfg.provider === "resend") {
      const r = await post("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text, ...(m.replyTo ? { reply_to: m.replyTo } : {}), ...(m.headers ? { headers: m.headers } : {}) }),
      });
      return r.ok ? { ok: true } : rejected(r.status, r.body);
    }
    if (cfg.provider === "brevo") {
      const r = await post("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": cfg.apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ sender: { name: m.fromName, email: m.fromEmail }, to: [{ email: m.to }], subject: m.subject, htmlContent: m.html, textContent: m.text, ...(m.replyTo ? { replyTo: { email: m.replyTo } } : {}), ...(m.headers ? { headers: m.headers } : {}) }),
      });
      return r.ok ? { ok: true } : rejected(r.status, r.body);
    }
    if (cfg.provider === "sendgrid") {
      const r = await post("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: m.to }] }],
          from: { email: m.fromEmail, name: m.fromName },
          ...(m.replyTo ? { reply_to: { email: m.replyTo } } : {}),
          subject: m.subject,
          content: [{ type: "text/plain", value: m.text }, { type: "text/html", value: m.html }],
          ...(m.headers ? { headers: m.headers } : {}),
        }),
      });
      return r.ok ? { ok: true } : rejected(r.status, r.body);
    }
    // mailgun
    const domain = cfg.extra.mailgunDomain?.trim();
    if (!domain) return { ok: false, error: "Add your Mailgun domain in the email settings." };
    const host = cfg.extra.mailgunRegion === "eu" ? "api.eu.mailgun.net" : "api.mailgun.net";
    const form = new URLSearchParams({ from, to: m.to, subject: m.subject, text: m.text, html: m.html });
    if (m.replyTo) form.set("h:Reply-To", m.replyTo);
    for (const [k, v] of Object.entries(m.headers ?? {})) form.set(`h:${k}`, v);
    const r = await post(`https://${host}/v3/${encodeURIComponent(domain)}/messages`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`api:${cfg.apiKey}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    return r.ok ? { ok: true } : rejected(r.status, r.body);
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return { ok: false, error: timedOut ? "The email provider took too long to answer." : "Could not reach the email provider." };
  }
};

/** Sends a list of messages a few at a time, keeping the order of the results. */
export const sendMany = async (cfg: MailConfig, messages: MailMessage[], concurrency = 5): Promise<SendResult[]> => {
  const results: SendResult[] = new Array(messages.length);
  let next = 0;
  const worker = async () => {
    while (next < messages.length) {
      const i = next++;
      results[i] = await sendMail(cfg, messages[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, messages.length) }, worker));
  return results;
};

export type MailSignal = { email: string; kind: "bounced" | "complained" | "unsubscribed" };

const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Turns a provider's webhook body into the addresses we must stop mailing. */
export const parseWebhook = (provider: MailProvider, body: unknown): MailSignal[] => {
  const out: MailSignal[] = [];
  const add = (email: unknown, kind: MailSignal["kind"]) => {
    if (typeof email === "string" && email.includes("@")) out.push({ email: email.trim().toLowerCase(), kind });
  };
  if (provider === "resend") {
    const b = asObj(body);
    const data = asObj(b.data);
    const to = Array.isArray(data.to) ? data.to : [];
    if (b.type === "email.bounced") {
      const bounceType = String(asObj(data.bounce).type ?? "permanent");
      if (/permanent/i.test(bounceType)) to.forEach((e) => add(e, "bounced"));
    } else if (b.type === "email.complained") to.forEach((e) => add(e, "complained"));
  } else if (provider === "brevo") {
    const b = asObj(body);
    const ev = String(b.event ?? "");
    if (ev === "hard_bounce" || ev === "blocked" || ev === "invalid_email") add(b.email, "bounced");
    else if (ev === "spam" || ev === "complaint") add(b.email, "complained");
    else if (ev === "unsubscribed") add(b.email, "unsubscribed");
  } else if (provider === "sendgrid") {
    const list = Array.isArray(body) ? body : [];
    for (const item of list.slice(0, 500)) {
      const e = asObj(item);
      if (e.event === "bounce") add(e.email, "bounced");
      else if (e.event === "spamreport") add(e.email, "complained");
      else if (e.event === "unsubscribe" || e.event === "group_unsubscribe") add(e.email, "unsubscribed");
    }
  } else {
    const d = asObj(asObj(body)["event-data"]);
    const ev = String(d.event ?? "");
    if (ev === "failed" && d.severity === "permanent") add(d.recipient, "bounced");
    else if (ev === "complained") add(d.recipient, "complained");
    else if (ev === "unsubscribed") add(d.recipient, "unsubscribed");
  }
  return out;
};
