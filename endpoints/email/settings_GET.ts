import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { mailKeyConfigured } from "../../helpers/mailCrypto";
import { platformSenderReady } from "../../helpers/emailConfig";
import { parseEmailTemplate } from "../../helpers/emailTemplate";
import type { MailProvider } from "../../helpers/mailProviders";
import type { OutputType } from "./settings_GET.schema";

export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    const plan = subscriptionPlan.resolve(business);
    const row = await db.selectFrom("emailSettings").selectAll().where("businessId", "=", business.id).executeTakeFirst();
    const extra = (row?.extra ?? {}) as Record<string, unknown>;
    const origin = new URL(request.url).origin;
    const own = row && row.provider !== "platform";
    const platformReady = await platformSenderReady();
    const output: OutputType = {
      serverReady: mailKeyConfigured(),
      isPremiumPlus: plan.isPremiumPlus,
      configured: Boolean(row),
      provider: (row?.provider as MailProvider | undefined) ?? "platform",
      fromName: row?.fromName || business.name,
      fromEmail: row?.fromEmail ?? "",
      replyTo: row?.replyTo ?? business.email ?? "",
      mailgunDomain: typeof extra.mailgunDomain === "string" ? extra.mailgunDomain : "",
      mailgunRegion: extra.mailgunRegion === "eu" ? "eu" : "us",
      hasKey: Boolean(own && row?.apiKeyEnc),
      verified: own ? Boolean(row?.verifiedAt) : platformReady,
      lastError: row?.lastError ?? null,
      webhookUrl: own && row ? `${origin}/_api/email/webhook?k=${row.webhookToken}` : null,
      platformReady,
      template: parseEmailTemplate(extra),
      business: {
        name: business.name,
        slug: business.slug,
        logoUrl: business.logoUrl,
        address: business.address,
        phone: business.phone,
        whatsappNumber: business.whatsappNumber,
        email: business.email,
      },
    };
    return new Response(superjson.stringify(output), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
    return new Response(
      superjson.stringify({ error: noBusiness ? "Create your business page first." : "Not authenticated" }),
      { status: noBusiness ? 400 : 401 },
    );
  }
}
