import superjson from "superjson";
import { nanoid } from "nanoid";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { isAddonEnabled } from "../../helpers/addons";
import { dropOptedOut, loadAudience } from "../../helpers/emailAudience";
import { fillTokens } from "../../helpers/emailAutomations";
import { platformSenderReady } from "../../helpers/emailConfig";
import { fillEmail, parseEmailTemplate, renderEmail } from "../../helpers/emailTemplate";
import { deliverMail } from "../../helpers/deliverMail";
import type { MailMessage } from "../../helpers/mailProviders";
import { schema, type OutputType } from "./send_POST.schema";

const MAX_PER_SEND = 200;
const fail = (error: string, status: number) => new Response(superjson.stringify({ error }), { status });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const noTags = (s: string) => s.replace(/\{\{/g, "{ {").replace(/\}\}/g, "} }");

export async function handle(request: Request) {
  let business;
  try {
    business = (await requireOwnedBusiness(request)).business;
  } catch {
    return fail("Not authenticated", 401);
  }
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const plan = subscriptionPlan.resolve(business);
    const appearance = (business.appearanceSettings ?? {}) as Record<string, unknown>;
    if (!plan.isPremiumPlus) return fail("The Email engine is included in Premium Plus.", 403);
    if (!isAddonEnabled(appearance, "email")) return fail("Switch on the Email engine in Add-ons first.", 403);

    const settings = (await db.selectFrom("emailSettings").selectAll().where("businessId", "=", business.id).executeTakeFirst()) ?? null;
    const provider = settings?.provider ?? "platform";
    if (provider === "platform") {
      if (!(await platformSenderReady())) return fail("The built-in sender is not switched on yet. Connect your own email provider in Email settings.", 503);
    } else if (!settings?.verifiedAt) {
      return fail("Send yourself a test email first, to confirm your settings work.", 400);
    }

    let audience;
    if (input.audience.kind === "list") {
      const seen = new Set<string>();
      const chosen: Array<{ email: string; name: string }> = [];
      for (const p of input.audience.people) {
        if (seen.has(p.email)) continue;
        seen.add(p.email);
        chosen.push({ email: p.email, name: p.name });
      }
      audience = { label: `Chosen recipients (${chosen.length})`, ...(await dropOptedOut(business.id, chosen)) };
    } else {
      audience = await loadAudience(business.id, input.audience);
    }
    if (audience.people.length === 0) return fail("Nobody to send to. People who unsubscribed are left out.", 400);
    if (audience.people.length > MAX_PER_SEND) {
      return fail(`This audience has ${audience.people.length} people. You can send to up to ${MAX_PER_SEND} at a time for now. Pick an event instead.`, 400);
    }

    // One unguessable unsubscribe token per contact.
    await db
      .insertInto("emailContacts")
      .values(audience.people.map((p) => ({ businessId: business.id, email: p.email, token: nanoid(32) })))
      .onConflict((oc) => oc.columns(["businessId", "email"]).doNothing())
      .execute();
    const contacts = await db
      .selectFrom("emailContacts")
      .select(["email", "token"])
      .where("businessId", "=", business.id)
      .where("email", "in", audience.people.map((p) => p.email))
      .execute();
    const tokenByEmail = new Map(contacts.map((c) => [c.email, c.token]));

    const origin = new URL(request.url).origin;
    const urlFor = (token: string) => `${origin}/_api/email/unsubscribe?t=${encodeURIComponent(token)}`;
    const pageUrlFor = (token: string) => `${origin}/unsubscribe?t=${encodeURIComponent(token)}`;

    const template = parseEmailTemplate({ template: { ...parseEmailTemplate(settings?.extra), ...(input.look ?? {}) } });
    // [name] is filled in per person; [business] is filled in now.
    const NAME = "\u27e6name\u27e7";
    const withBusiness = (s: string) => fillTokens(s, { business: business.name }).replace(/\[name\]/gi, NAME);
    const rendered = renderEmail({ business, template, message: withBusiness(input.message), origin });
    const subjectTemplate = noTags(withBusiness(input.subject));

    const messages: MailMessage[] = audience.people.map((p) => {
      const token = tokenByEmail.get(p.email) ?? "";
      const first = p.name.trim().split(/\s+/)[0] || "there";
      const vars = { greeting: first.replace(/[\r\n]/g, " "), greetingHtml: esc(first), unsubscribeUrl: pageUrlFor(token) };
      return {
        fromName: settings?.fromName ?? business.name,
        fromEmail: settings?.fromEmail ?? "",
        to: p.email,
        replyTo: settings?.replyTo ?? business.email ?? undefined,
        subject: subjectTemplate.split(NAME).join(first.replace(/[\r\n]/g, " ")),
        html: fillEmail(rendered.html, vars).split(NAME).join(esc(first)),
        text: fillEmail(rendered.text, vars).split(NAME).join(first.replace(/[\r\n]/g, " ")),
        headers: {
          "List-Unsubscribe": `<${urlFor(token)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      };
    });

    const results = await deliverMail(settings, business.name, business.email, messages);
    const sent = results.filter((r) => r.ok).length;
    const failed = results.length - sent;
    const firstError = results.find((r) => !r.ok);
    const errorText = firstError && !firstError.ok ? firstError.error : null;

    await db
      .insertInto("emailCampaigns")
      .values({
        businessId: business.id,
        subject: input.subject,
        message: input.message,
        audience: input.audience.kind === "customers" ? "customers" : input.audience.kind === "list" ? "list" : `event:${input.audience.eventId}`,
        audienceLabel: audience.label,
        recipientCount: audience.people.length,
        sentCount: sent,
        failedCount: failed,
        error: errorText,
        look: input.look ?? null,
      })
      .execute();
    if (sent > 0 && input.draftId) {
      await db.deleteFrom("emailDrafts").where("id", "=", input.draftId).where("businessId", "=", business.id).execute();
    }

    if (sent === 0 && errorText) return fail(errorText, 502);
    return new Response(
      superjson.stringify({ recipients: audience.people.length, sent, failed, skippedOptedOut: audience.excluded } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not send the email.", 400);
  }
}
