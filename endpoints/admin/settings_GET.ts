import superjson from "superjson";
import { requireAdmin } from "../../helpers/requireAdmin";
import { platformSettings } from "../../helpers/platformSettings";
import { smtpConfig } from "../../helpers/emailConfig";
import { mailKeyConfigured } from "../../helpers/mailCrypto";
import { currentPlanConfig, loadPlanConfig } from "../../helpers/planConfig";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { effectiveAddons } from "../../helpers/effectiveAddons";
import { db } from "../../helpers/db";
import { SUBSCRIPTION_GATEWAY_KEY, flutterwaveEnv, type StoredSubscriptionGateway } from "../../helpers/flutterwaveEnv";
import type { OutputType } from "./settings_GET.schema";

export async function handle(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    return new Response(superjson.stringify({ error: error instanceof Error ? error.message : "Not allowed" }), { status: 403 });
  }
  try {
    const origin = new URL(request.url).origin;
    await loadPlanConfig();
    const smtp = await smtpConfig();
    const stored = await platformSettings.get<StoredSubscriptionGateway>(SUBSCRIPTION_GATEWAY_KEY);
    const keys = await flutterwaveEnv();
    const addons = await effectiveAddons();
    const purchases = await db.selectFrom("addonPurchases").select(["addonId", "expiresAt"]).execute();
    const now = new Date();
    const output: OutputType = {
      serverReady: mailKeyConfigured(),
      smtp: {
        source: smtp.source,
        ready: Boolean(smtp.host && smtp.user && smtp.pass && smtp.fromEmail),
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        user: smtp.user,
        hasPass: Boolean(smtp.pass),
        fromEmail: smtp.fromEmail,
        fromName: smtp.fromName,
        inboxDomain: smtp.inboxDomain,
        hasInboundSecret: smtp.inboundSecret.length >= 16,
        inboundUrl: `${origin}/_api/email/inbound`,
      },
      gateway: {
        source: stored?.secretKeyEnc ? "admin" : keys.secretKey ? "env" : "none",
        hasSecret: Boolean(keys.secretKey),
        hasWebhookHash: Boolean(keys.webhookHash),
        verified: Boolean(stored?.verifiedAt),
        webhookUrl: `${origin}/_api/subscription/webhook`,
      },
      plans: currentPlanConfig(),
      addons: addons.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        access: a.access,
        comingSoon: Boolean(a.comingSoon),
        hidden: a.hidden,
        freeForAll: a.freeForAll,
        priceMonthlyNgn: a.priceMonthlyNgn,
        includedPlanIds: a.includedPlanIds,
        feature: a.feature,
        shops: purchases.filter((p) => p.addonId === a.id && new Date(p.expiresAt) > now).length,
      })),
      catalog: subscriptionPlan.catalog,
      planSettings: {
        trialPlanId: subscriptionPlan.trialPlanId,
        trialDays: subscriptionPlan.trialDays,
        registrationPromoPercent: subscriptionPlan.registrationPromoPercent,
        maxDurationMonths: subscriptionPlan.maxDurationMonths,
      },
    };
    return new Response(superjson.stringify(output), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(superjson.stringify({ error: error instanceof Error ? error.message : "Could not load settings." }), { status: 500 });
  }
}

