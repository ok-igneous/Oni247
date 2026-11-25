/**
 * Email look and business details. Pure functions, used by the sending
 * endpoints and by the settings page preview, so what the owner previews is
 * what customers receive. Owner-written text can never create a {{tag}}.
 */
export type EmailGreeting = "first_name" | "hello" | "none";

export type EmailTemplate = {
  accent: string;
  showLogo: boolean;
  greeting: EmailGreeting;
  signature: string;
  footerNote: string;
  showAddress: boolean;
  showPhone: boolean;
  showWhatsapp: boolean;
  showWebsite: boolean;
  buttonLabel: string;
  buttonUrl: string;
  preheader: string;
};

export const DEFAULT_EMAIL_TEMPLATE: EmailTemplate = {
  accent: "#1f5c3a",
  showLogo: true,
  greeting: "first_name",
  signature: "",
  footerNote: "",
  showAddress: true,
  showPhone: true,
  showWhatsapp: false,
  showWebsite: true,
  buttonLabel: "",
  buttonUrl: "",
  preheader: "",
};

const str = (v: unknown, max: number, fallback = "") => (typeof v === "string" ? v.trim().slice(0, max) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const HEX = /^#[0-9a-fA-F]{6}$/;
const WEB = /^https?:\/\/[^\s]+$/i;

/** Reads email_settings.extra.template defensively. */
export const parseEmailTemplate = (extra: unknown): EmailTemplate => {
  const root = extra && typeof extra === "object" && !Array.isArray(extra) ? (extra as Record<string, unknown>) : {};
  const t = root.template && typeof root.template === "object" && !Array.isArray(root.template) ? (root.template as Record<string, unknown>) : {};
  const d = DEFAULT_EMAIL_TEMPLATE;
  return {
    accent: typeof t.accent === "string" && HEX.test(t.accent) ? t.accent : d.accent,
    showLogo: bool(t.showLogo, d.showLogo),
    greeting: t.greeting === "hello" || t.greeting === "none" ? t.greeting : "first_name",
    signature: str(t.signature, 300),
    footerNote: str(t.footerNote, 300),
    showAddress: bool(t.showAddress, d.showAddress),
    showPhone: bool(t.showPhone, d.showPhone),
    showWhatsapp: bool(t.showWhatsapp, d.showWhatsapp),
    showWebsite: bool(t.showWebsite, d.showWebsite),
    buttonLabel: str(t.buttonLabel, 40),
    buttonUrl: typeof t.buttonUrl === "string" && WEB.test(t.buttonUrl.trim()) ? t.buttonUrl.trim().slice(0, 500) : "",
    preheader: str(t.preheader, 120),
  };
};

export type EmailBusiness = {
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const noTags = (s: string) => s.replace(/\{\{/g, "{ {").replace(/\}\}/g, "} }");
const paragraphs = (s: string) =>
  noTags(s)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

/**
 * Builds the HTML and plain text of one email. Placeholders left in the output:
 * {{greeting}} / {{greetingHtml}} (first name) and {{unsubscribeUrl}}.
 */
export const renderEmail = (opts: {
  business: EmailBusiness;
  template: EmailTemplate;
  message: string;
  origin: string;
  /** Preview and test emails have no unsubscribe link to give. */
  unsubscribe?: boolean;
}): { html: string; text: string } => {
  const { business, template: t, origin } = opts;
  const unsubscribe = opts.unsubscribe !== false;
  const name = noTags(business.name);
  const site = `${origin}/${business.slug}`;
  const logo =
    t.showLogo && business.logoUrl
      ? business.logoUrl.startsWith("http")
        ? business.logoUrl
        : business.logoUrl.startsWith("/")
          ? `${origin}${business.logoUrl}`
          : ""
      : "";

  const details: string[] = [];
  if (t.showAddress && business.address) details.push(noTags(business.address));
  if (t.showPhone && business.phone) details.push(noTags(business.phone));
  if (t.showWhatsapp && business.whatsappNumber) details.push(`WhatsApp ${noTags(business.whatsappNumber)}`);
  const detailsText = details.join(" · ");

  const greetHtml = t.greeting === "first_name" ? `<p style="margin:0 0 14px">Hi {{greetingHtml}},</p>` : t.greeting === "hello" ? `<p style="margin:0 0 14px">Hello,</p>` : "";
  const greetText = t.greeting === "first_name" ? "Hi {{greeting}},\n\n" : t.greeting === "hello" ? "Hello,\n\n" : "";

  const button =
    t.buttonLabel && t.buttonUrl
      ? `<p style="margin:18px 0"><a href="${esc(t.buttonUrl)}" style="background:${t.accent};color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:6px;display:inline-block;font-weight:600">${esc(noTags(t.buttonLabel))}</a></p>`
      : "";
  const signature = t.signature ? `<p style="margin:18px 0 0;line-height:1.6">${esc(noTags(t.signature)).replace(/\n/g, "<br>")}</p>` : "";

  const html =
    `<div style="background:#f4f1ea;padding:20px 12px;font-family:Arial,Helvetica,sans-serif">` +
    (t.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(noTags(t.preheader))}</div>` : "") +
    `<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e6e0d4">` +
    `<div style="background:${t.accent};padding:16px 22px;color:#ffffff;font-size:18px;font-weight:700">` +
    (logo ? `<img src="${esc(logo)}" alt="" height="32" style="vertical-align:middle;margin-right:10px;border-radius:4px;background:#fff">` : "") +
    `<span style="vertical-align:middle">${esc(name)}</span></div>` +
    `<div style="padding:22px;color:#222;font-size:15px">${greetHtml}${paragraphs(opts.message)}${button}${signature}</div>` +
    `<div style="padding:16px 22px;background:#faf8f3;color:#666;font-size:12px;line-height:1.6;border-top:1px solid #eee">` +
    `<strong>${esc(name)}</strong>${detailsText ? `<br>${esc(detailsText)}` : ""}` +
    (t.showWebsite ? `<br><a href="${esc(site)}" style="color:${t.accent}">${esc(site.replace(/^https?:\/\//, ""))}</a>` : "") +
    (business.email ? `<br>Reply to this email to reach us.` : "") +
    (t.footerNote ? `<br><br>${esc(noTags(t.footerNote)).replace(/\n/g, "<br>")}` : "") +
    (unsubscribe ? `<br><br><a href="{{unsubscribeUrl}}" style="color:#666">Unsubscribe</a>` : "") +
    `</div></div></div>`;

  const text =
    `${greetText}${noTags(opts.message)}` +
    (t.buttonLabel && t.buttonUrl ? `\n\n${noTags(t.buttonLabel)}: ${t.buttonUrl}` : "") +
    (t.signature ? `\n\n${noTags(t.signature)}` : "") +
    `\n\n--\n${name}${detailsText ? ` · ${detailsText}` : ""}` +
    (t.showWebsite ? `\n${site}` : "") +
    (t.footerNote ? `\n${noTags(t.footerNote)}` : "") +
    (unsubscribe ? `\nUnsubscribe: {{unsubscribeUrl}}` : "");

  return { html, text };
};

/** Fills {{tags}}; unknown tags become empty. */
export const fillEmail = (template: string, vars: Record<string, string>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
