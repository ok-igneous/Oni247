import superjson from "superjson";
import { nanoid } from "nanoid";
import { db } from "../../helpers/db";
import type { Json } from "../../helpers/schema";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { encryptSecret, mailKeyConfigured } from "../../helpers/mailCrypto";
import { parseEmailTemplate } from "../../helpers/emailTemplate";
import { schema, type OutputType } from "./settings_POST.schema";

const fail = (error: string, status: number) => new Response(superjson.stringify({ error }), { status });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handle(request: Request) {
  let business;
  try {
    business = (await requireOwnedBusiness(request)).business;
  } catch {
    return fail("Not authenticated", 401);
  }
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    if (!subscriptionPlan.resolve(business).isPremiumPlus) return fail("The Email engine is included in Premium Plus.", 403);

    const own = input.provider !== "platform";
    if (own) {
      if (!mailKeyConfigured()) return fail("Using your own email provider can't be saved yet. Please contact support.", 503);
      if (!input.fromEmail || !EMAIL_RE.test(input.fromEmail)) return fail("Enter a valid sender email.", 400);
      if (input.provider === "mailgun" && !input.mailgunDomain?.trim()) return fail("Add your Mailgun domain.", 400);
    }

    const existing = await db.selectFrom("emailSettings").select(["businessId", "provider", "extra"]).where("businessId", "=", business.id).executeTakeFirst();
    const newKey = input.apiKey?.trim();
    if (own && !newKey && (!existing || existing.provider === "platform")) return fail("Enter your provider API key.", 400);

    const template = parseEmailTemplate({ template: input.template ?? parseEmailTemplate(existing?.extra) });
    const extra = (own && input.provider === "mailgun"
      ? { mailgunDomain: input.mailgunDomain?.trim(), mailgunRegion: input.mailgunRegion ?? "us", template }
      : { template }) as Json;

    const common = {
      provider: input.provider,
      fromName: input.fromName,
      fromEmail: own ? (input.fromEmail as string).toLowerCase() : "",
      replyTo: input.replyTo ? input.replyTo.toLowerCase() : null,
      extra,
      // The built-in sender needs no test. Your own provider must be tested again after any change.
      verifiedAt: null,
      lastError: null,
      updatedAt: new Date(),
    };

    if (existing) {
      const keyUpdate = own ? (newKey ? { apiKeyEnc: await encryptSecret(newKey) } : {}) : { apiKeyEnc: "" };
      await db.updateTable("emailSettings").set({ ...common, ...keyUpdate }).where("businessId", "=", business.id).execute();
    } else {
      await db
        .insertInto("emailSettings")
        .values({ ...common, businessId: business.id, apiKeyEnc: own ? await encryptSecret(newKey as string) : "", webhookToken: nanoid(32) })
        .execute();
    }
    return new Response(superjson.stringify({ saved: true } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not save the email settings.", 400);
  }
}