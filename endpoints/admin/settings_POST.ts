import superjson from "superjson";
import { requireAdmin } from "../../helpers/requireAdmin";
import { platformSettings } from "../../helpers/platformSettings";
import { SMTP_KEY, smtpConfig, type StoredSmtp } from "../../helpers/emailConfig";
import { encryptSecret, mailKeyConfigured } from "../../helpers/mailCrypto";
import { sendViaSmtp } from "../../helpers/smtpSend";
import { CATALOG_KEY, PLANS_KEY, loadPlanConfig } from "../../helpers/planConfig";
import { DEFAULT_PLANS, subscriptionPlan, type PlanDef } from "../../helpers/subscriptionPlan";
import { isFeatureId, type FeatureId } from "../../helpers/features";
import { ADDONS } from "../../helpers/addons";
import { ADDONS_KEY, type AddonOverride } from "../../helpers/effectiveAddons";
import { SUBSCRIPTION_GATEWAY_KEY, flutterwaveEnv, type StoredSubscriptionGateway } from "../../helpers/flutterwaveEnv";
import { schema, type OutputType } from "./settings_POST.schema";

const fail = (error: string, status: number) => new Response(superjson.stringify({ error }), { status });
const ok = (message?: string) => new Response(superjson.stringify({ ok: true, message } satisfies OutputType), { headers: { "Content-Type": "application/json" } });

export async function handle(request: Request) {
  let admin;
  try {
    admin = (await requireAdmin(request)).user;
  } catch {
    return fail("Not allowed", 403);
  }
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const needsKey = input.op === "smtp.save" || input.op === "gateway.save";
    if (needsKey && !mailKeyConfigured()) return fail("Secret storage is not set up. Add the EMAIL_SETTINGS_KEY secret first.", 503);

    switch (input.op) {
      case "smtp.save": {
        const old = await platformSettings.get<StoredSmtp>(SMTP_KEY);
        const pass = input.pass?.trim();
        if (!pass && !old?.passEnc) return fail("Enter the mail server password.", 400);
        if (input.inboundSecret && input.inboundSecret.trim().length > 0 && input.inboundSecret.trim().length < 16) return fail("The inbound secret needs at least 16 characters.", 400);
        const next: StoredSmtp = {
          host: input.host,
          port: input.port,
          secure: input.secure,
          user: input.user,
          passEnc: pass ? await encryptSecret(pass) : (old?.passEnc ?? ""),
          fromEmail: input.fromEmail,
          fromName: input.fromName,
          inboxDomain: input.inboxDomain.replace(/^@/, "").toLowerCase(),
          inboundSecretEnc: input.inboundSecret?.trim() ? await encryptSecret(input.inboundSecret.trim()) : (old?.inboundSecretEnc ?? ""),
        };
        await platformSettings.set(SMTP_KEY, next);
        return ok("Mail server saved. Send a test email to check it.");
      }
      case "smtp.remove":
        await platformSettings.set(SMTP_KEY, null);
        return ok("Mail server settings removed.");
      case "smtp.test": {
        const c = await smtpConfig();
        if (!(c.host && c.user && c.pass && c.fromEmail)) return fail("Save the mail server settings first.", 400);
        const [result] = await sendViaSmtp([
          {
            fromName: c.fromName || "Oni247",
            to: admin.email,
            subject: "Oni247 mail server test",
            text: "This is a test from your Oni247 admin settings. Your mail server works.",
            html: '<p style="font-family:Arial,sans-serif">This is a test from your Oni247 admin settings. <strong>Your mail server works.</strong></p>',
          },
        ]);
        if (!result.ok) return fail(result.error, 502);
        return ok(`Test email sent to ${admin.email}.`);
      }
      case "gateway.save": {
        const old = await platformSettings.get<StoredSubscriptionGateway>(SUBSCRIPTION_GATEWAY_KEY);
        const secret = input.secretKey?.trim();
        const hash = input.webhookHash?.trim();
        if (!secret && !old?.secretKeyEnc) return fail("Enter the Flutterwave secret key.", 400);
        const next: StoredSubscriptionGateway = {
          provider: "flutterwave",
          secretKeyEnc: secret ? await encryptSecret(secret) : (old?.secretKeyEnc ?? ""),
          webhookHashEnc: hash ? await encryptSecret(hash) : (old?.webhookHashEnc ?? ""),
          testMode: secret ? /TEST/i.test(secret) : (old?.testMode ?? false),
          verifiedAt: secret ? null : (old?.verifiedAt ?? null),
        };
        await platformSettings.set(SUBSCRIPTION_GATEWAY_KEY, next);
        return ok("Saved. Test the key to confirm it works.");
      }
      case "gateway.remove":
        await platformSettings.set(SUBSCRIPTION_GATEWAY_KEY, null);
        return ok("Subscription gateway removed.");
      case "gateway.test": {
        const keys = await flutterwaveEnv();
        if (!keys.secretKey) return fail("Save the Flutterwave secret key first.", 400);
        const res = await fetch("https://api.flutterwave.com/v3/balances", { headers: { Authorization: `Bearer ${keys.secretKey}` } });
        if (!res.ok) return fail(res.status === 401 ? "Flutterwave rejected this key. Check it and try again." : "Could not reach Flutterwave. Try again.", 502);
        const old = await platformSettings.get<StoredSubscriptionGateway>(SUBSCRIPTION_GATEWAY_KEY);
        if (old) await platformSettings.set(SUBSCRIPTION_GATEWAY_KEY, { ...old, verifiedAt: new Date().toISOString() });
        return ok("Flutterwave key works.");
      }
      case "plans.save": {
        const { op: _op, ...values } = input;
        await platformSettings.set(PLANS_KEY, values);
        await loadPlanConfig();
        return ok("Plans saved.");
      }
      case "addon.save": {
        if (!ADDONS.some((a) => a.id === input.id)) return fail("Unknown add-on.", 400);
        const saved = (await platformSettings.get<Record<string, AddonOverride>>(ADDONS_KEY)) ?? {};
        saved[input.id] = { name: input.name, description: input.description, access: input.access, comingSoon: input.comingSoon, hidden: input.hidden };
        await platformSettings.set(ADDONS_KEY, saved);
        return ok("Add-on saved.");
      }
      case "catalog.save": {
        const builtInIds = DEFAULT_PLANS.map((p) => p.id);
        const ids = input.plans.map((p) => p.id);
        if (new Set(ids).size !== ids.length) return fail("Two plans have the same id.", 400);
        for (const id of builtInIds) if (!ids.includes(id)) return fail("The Free, One-Page and Premium Plus plans cannot be removed. Switch them off instead.", 400);
        const plans: PlanDef[] = input.plans.map((p, index) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          priceMonthlyNgn: p.id === "free" ? 0 : p.priceMonthlyNgn,
          features: p.features.filter(isFeatureId) as FeatureId[],
          productLimit: p.productLimit,
          dailyCreationLimit: p.dailyCreationLimit,
          highlighted: p.highlighted,
          active: p.id === "free" ? true : p.active,
          builtIn: builtInIds.includes(p.id),
          sort: p.id === "free" ? 0 : Math.max(1, p.sort || index),
        }));
        const trial = plans.find((p) => p.id === input.trialPlanId && p.id !== "free") ? input.trialPlanId : "premium_plus";
        await platformSettings.set(CATALOG_KEY, { plans });
        await platformSettings.set(PLANS_KEY, { trialDays: input.trialDays, trialPlanId: trial, registrationPromoPercent: input.registrationPromoPercent, maxDurationMonths: input.maxDurationMonths });
        await loadPlanConfig();
        return ok("Plans saved.");
      }
      case "addon.config": {
        const addon = ADDONS.find((a) => a.id === input.id);
        if (!addon) return fail("Unknown add-on.", 400);
        await loadPlanConfig();
        if (addon.feature) {
          const feature = addon.feature;
          const plans = subscriptionPlan.catalog.map((p) => {
            const has = p.features.includes(feature);
            const want = input.includedPlanIds.includes(p.id);
            if (has === want) return p;
            return { ...p, features: want ? [...p.features, feature] : p.features.filter((f) => f !== feature) };
          });
          await platformSettings.set(CATALOG_KEY, { plans });
          await loadPlanConfig();
        }
        const saved = (await platformSettings.get<Record<string, AddonOverride>>(ADDONS_KEY)) ?? {};
        saved[input.id] = {
          name: input.name,
          description: input.description,
          freeForAll: input.freeForAll,
          priceMonthlyNgn: input.freeForAll ? 0 : input.priceMonthlyNgn,
          comingSoon: input.comingSoon,
          hidden: input.hidden,
        };
        await platformSettings.set(ADDONS_KEY, saved);
        return ok("Add-on saved.");
      }
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not save that.", 400);
  }
}

