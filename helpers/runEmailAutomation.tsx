import { db } from "./db";
import { isAddonEnabled } from "./addons";
import { subscriptionPlan } from "./subscriptionPlan";
import { platformSenderReady } from "./emailConfig";
import { deliverMail } from "./deliverMail";
import { automationDef, fillTokens, type AutomationTrigger } from "./emailAutomations";
import { fillEmail, parseEmailTemplate, renderEmail } from "./emailTemplate";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * Sends an automatic email if the shop switched it on. Backend only. It never
 * throws: a failed automatic email must never break an order or a registration.
 * Await it, because work left running after a response is refused.
 */
export const runEmailAutomation = async (
  businessId: string,
  trigger: AutomationTrigger,
  person: { email: string | null | undefined; name: string },
  vars: { order?: string; event?: string; service?: string } = {},
  origin = "",
): Promise<void> => {
  try {
    const email = (person.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return;
    const automation = await db.selectFrom("emailAutomations").selectAll().where("businessId", "=", businessId).where("trigger", "=", trigger).executeTakeFirst();
    if (!automation?.enabled) return;
    const business = await db.selectFrom("businesses").selectAll().where("id", "=", businessId).executeTakeFirst();
    if (!business || business.status !== "published") return;
    const appearance = (business.appearanceSettings ?? {}) as Record<string, unknown>;
    const bought = await db.selectFrom("addonPurchases").select("expiresAt").where("businessId", "=", businessId).where("addonId", "=", "email").executeTakeFirst();
    const hasEmail = subscriptionPlan.resolve({ ...business, extraFeatures: bought && new Date(bought.expiresAt) > new Date() ? ["email"] : [] }).features.includes("email");
    if (!hasEmail || !isAddonEnabled(appearance, "email")) return;

    // Someone who unsubscribed or whose address bounced is never emailed again.
    const contact = await db.selectFrom("emailContacts").select(["unsubscribedAt", "bouncedAt"]).where("businessId", "=", businessId).where("email", "=", email).executeTakeFirst();
    if (contact?.unsubscribedAt || contact?.bouncedAt) return;

    const settings = (await db.selectFrom("emailSettings").selectAll().where("businessId", "=", businessId).executeTakeFirst()) ?? null;
    const provider = settings?.provider ?? "platform";
    if (provider === "platform" ? !(await platformSenderReady()) : !settings?.verifiedAt) return;

    const def = automationDef(trigger);
    const first = person.name.trim().split(/\s+/)[0] || "there";
    const tokens = { name: first, business: business.name, order: vars.order, event: vars.event, service: vars.service };
    const subject = fillTokens(automation.subject || def?.subject || "", tokens).replace(/[\r\n]+/g, " ").slice(0, 150);
    const message = fillTokens(automation.message || def?.message || "", tokens).slice(0, 5000);
    if (!subject.trim() || !message.trim()) return;

    const rendered = renderEmail({ business, template: parseEmailTemplate(settings?.extra), message, origin, unsubscribe: false });
    const html = fillEmail(rendered.html, { greeting: first, greetingHtml: esc(first), unsubscribeUrl: "" });
    const text = fillEmail(rendered.text, { greeting: first, greetingHtml: esc(first), unsubscribeUrl: "" });
    const [result] = await deliverMail(settings, business.name, business.email, [
      { fromName: settings?.fromName ?? business.name, fromEmail: settings?.fromEmail ?? "", to: email, replyTo: settings?.replyTo ?? business.email ?? undefined, subject, html, text },
    ]);
    await db
      .insertInto("emailCampaigns")
      .values({
        businessId,
        subject,
        message,
        audience: `auto:${trigger}`,
        audienceLabel: `Automatic: ${def?.label ?? trigger}`,
        recipientCount: 1,
        sentCount: result.ok ? 1 : 0,
        failedCount: result.ok ? 0 : 1,
        error: result.ok ? null : result.error,
      })
      .execute();
  } catch (error) {
    console.error("automatic email failed", error instanceof Error ? error.message : error);
  }
};
