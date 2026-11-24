import superjson from "superjson";
import { nanoid } from "nanoid";
import { db } from "../../helpers/db";
import { decryptSecret } from "../../helpers/mailCrypto";
import { initCheckout } from "../../helpers/gatewayApi";
import type { GatewayProvider } from "../../helpers/paymentProviders";
import { schema, type OutputType } from "./start_POST.schema";

const fail = (error: string, status: number) => new Response(superjson.stringify({ error }), { status });

export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const link = await db.selectFrom("paymentLinks").selectAll().where("code", "=", input.code.toLowerCase()).executeTakeFirst();
    if (!link || !link.active) return fail("This payment link is not available.", 404);
    const business = await db.selectFrom("businesses").select(["id", "name", "currency", "status"]).where("id", "=", link.businessId).executeTakeFirst();
    if (!business || business.status === "suspended") return fail("This payment link is not available.", 404);
    const gateway = await db.selectFrom("paymentGateways").selectAll().where("businessId", "=", business.id).where("enabled", "=", true).limit(1).executeTakeFirst();
    if (!gateway) return fail("Online payment is not available right now.", 400);

    // A fixed link always charges its own amount, whatever the browser sends.
    const amount = link.amount !== null ? Number.parseFloat(link.amount) : input.amount;
    if (!amount || amount <= 0) return fail("Enter the amount you want to pay.", 400);

    const reference = `pl-${nanoid(14)}`.replace(/[^A-Za-z0-9-]/g, "a");
    const origin = new URL(request.url).origin;
    const back = `${origin}/pay/${link.code}?ref=${encodeURIComponent(reference)}`;
    const started = await initCheckout(gateway.provider as GatewayProvider, await decryptSecret(gateway.secretEnc), {
      reference,
      amount,
      currency: business.currency,
      email: input.email,
      name: input.name,
      phone: input.phone,
      title: `${link.title} — ${business.name}`,
      description: link.description || link.title,
      returnUrl: back,
      cancelUrl: back,
    });
    if (!started.ok) return fail(started.error, 502);
    await db
      .insertInto("linkPayments")
      .values({ businessId: business.id, linkId: link.id, reference, payerName: input.name, payerEmail: input.email, payerPhone: input.phone ?? null, amount: amount.toFixed(2), currency: business.currency, status: "pending", provider: gateway.provider, providerRef: started.providerRef ?? null })
      .execute();
    return new Response(superjson.stringify({ url: started.url } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not start the payment.", 400);
  }
}
