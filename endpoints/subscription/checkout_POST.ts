import superjson from "superjson";
import { nanoid } from "nanoid";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { flutterwaveEnv } from "../../helpers/flutterwaveEnv";
import { effectiveAddons } from "../../helpers/effectiveAddons";
import { schema, type OutputType } from "./checkout_POST.schema";

export async function handle(request: Request) {
  const secretKey = (await flutterwaveEnv()).secretKey;
  if (!secretKey) {
    return new Response(
      superjson.stringify({
        error: "Payments are not configured yet. Please try again shortly.",
      }),
      { status: 503 },
    );
  }

  let business;
  let userEmail: string;
  try {
    const session = await requireOwnedBusiness(request);
    business = session.business;
    userEmail = session.user.email;
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const isAddon = input.websitePlan.startsWith("addon:");
    const addon = isAddon ? (await effectiveAddons()).find((a) => a.id === input.websitePlan.slice(6) && !a.hidden) : undefined;
    const chosenPlan = isAddon ? undefined : subscriptionPlan.planById(input.websitePlan);
    if (isAddon) {
      if (!addon || addon.freeForAll || addon.comingSoon || addon.priceMonthlyNgn <= 0) {
        return new Response(superjson.stringify({ error: "That add-on cannot be bought separately." }), { status: 400 });
      }
    } else if (!chosenPlan || chosenPlan.id === "free" || !chosenPlan.active || chosenPlan.priceMonthlyNgn <= 0) {
      return new Response(superjson.stringify({ error: "That plan is not available." }), { status: 400 });
    }
    const itemName = addon ? `${addon.name} add-on` : (chosenPlan?.name ?? "Plan");
    if (input.durationMonths > subscriptionPlan.maxDurationMonths) {
      return new Response(superjson.stringify({ error: `Choose up to ${subscriptionPlan.maxDurationMonths} months.` }), { status: 400 });
    }
    const promo = !isAddon && !business.registrationPromoUsed;
    // The price is decided HERE, from the server's own constants. Nothing about
    // the amount comes from the browser.
    const amount = addon ? Math.round(addon.priceMonthlyNgn * input.durationMonths * 100) / 100 : subscriptionPlan.priceFor(input.websitePlan, input.durationMonths, promo);
    const currency = subscriptionPlan.currency;
    const txRef = `oniduka-${business.id.slice(0, 8)}-${nanoid(12)}`;

    await db
      .insertInto("subscriptionPayments")
      .values({
        businessId: business.id,
        provider: "flutterwave",
        txRef,
        amount: amount.toFixed(2),
        currency,
        websitePlan: input.websitePlan,
        durationMonths: input.durationMonths,
        promoApplied: promo,
        status: "pending",
      })
      .executeTakeFirstOrThrow();

    const origin = new URL(request.url).origin;

    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency,
        redirect_url: `${origin}${isAddon ? "/dashboard/addons" : "/dashboard/plan"}`,
        payment_options: "card,banktransfer,ussd",
        customer: {
          email: userEmail,
          name: business.name,
          phonenumber: business.phone ?? undefined,
        },
        customizations: {
          title: `Oni247 ${itemName}`,
          description: `${itemName} — ${input.durationMonths} month${input.durationMonths === 1 ? "" : "s"}${promo ? ` — ${subscriptionPlan.registrationPromoPercent}% registration promo` : ""}`,
        },
      }),
    });

    const payload = (await response.json()) as {
      status?: string;
      message?: string;
      data?: { link?: string };
    };

    if (!response.ok || payload.status !== "success" || !payload.data?.link) {
      await db
        .updateTable("subscriptionPayments")
        .set({ status: "failed", updatedAt: new Date() })
        .where("txRef", "=", txRef)
        .execute();

      return new Response(
        superjson.stringify({
          error: payload.message ?? "Could not start the payment. Try again.",
        }),
        { status: 502 },
      );
    }

    return new Response(
      superjson.stringify({
        paymentLink: payload.data.link,
        txRef,
      } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start the payment.";
    return new Response(superjson.stringify({ error: message }), {
      status: 500,
    });
  }
}
