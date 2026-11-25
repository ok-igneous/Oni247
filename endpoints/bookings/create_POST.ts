import superjson from "superjson";
import { customAlphabet, nanoid } from "nanoid";
import { db } from "../../helpers/db";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { readServices } from "../../helpers/serviceModel";
import { bookingAmounts, type GatewayProvider } from "../../helpers/paymentProviders";
import { initCheckout } from "../../helpers/gatewayApi";
import { decryptSecret } from "../../helpers/mailCrypto";
import { runEmailAutomation } from "../../helpers/runEmailAutomation";
import { schema, type OutputType } from "./create_POST.schema";

const makeCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);
const fail = (error: string, status: number) => new Response(superjson.stringify({ error }), { status });

/** A customer books a service. Public. The price is read from the shop's own settings, never from the request. */
export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const business = await db.selectFrom("businesses").selectAll().where("slug", "=", input.slug).where("status", "=", "published").executeTakeFirst();
    if (!business) return fail("This business page was not found.", 404);
    if (!subscriptionPlan.resolve(business).canUseServices) return fail("This business is not taking bookings right now.", 403);
    const service = readServices(business.contentSettings).find((s) => s.id === input.serviceId && s.published);
    if (!service) return fail("This service is no longer available.", 404);

    const email = (input.email ?? "").trim().toLowerCase();
    const phone = (input.phone ?? "").trim();
    if (!email && !phone) return fail("Add a phone number or an email so the business can reach you.", 400);

    const amounts = bookingAmounts(service);
    const wantsOnline = input.payOnline && amounts.mode !== "enquiry" && amounts.due !== null;
    if (wantsOnline && !email) return fail("Enter your email address. Your payment receipt is sent there.", 400);

    const recent = await db
      .selectFrom("serviceBookings")
      .select((eb) => eb.fn.countAll<string>().as("n"))
      .where("businessId", "=", business.id)
      .where("createdAt", ">", new Date(Date.now() - 3_600_000))
      .where((eb) => eb.or([email ? eb("customerEmail", "=", email) : eb.val(false), phone ? eb("customerPhone", "=", phone) : eb.val(false)]))
      .executeTakeFirst();
    if (Number(recent?.n ?? 0) >= 5) return fail("You have made several bookings in a short time. Please wait a while and try again.", 429);

    const code = makeCode();
    await db
      .insertInto("serviceBookings")
      .values({
        businessId: business.id,
        code,
        serviceId: service.id,
        serviceName: service.name,
        customerName: input.name,
        customerPhone: phone || null,
        customerEmail: email || null,
        preferredDate: input.date || null,
        preferredTime: input.time || null,
        location: input.location || null,
        notes: input.notes || null,
        currency: business.currency,
        amountTotal: (amounts.total ?? 0).toFixed(2),
        amountDue: wantsOnline ? (amounts.due as number).toFixed(2) : "0",
        checkoutMode: wantsOnline ? amounts.mode : "enquiry",
      })
      .execute();

    const origin = new URL(request.url).origin;
    let paymentUrl: string | null = null;
    let message: string | null = null;

    if (wantsOnline) {
      const gateway = await db.selectFrom("paymentGateways").selectAll().where("businessId", "=", business.id).where("enabled", "=", true).limit(1).executeTakeFirst();
      if (!gateway) {
        message = "Online payment is not available right now. Your booking was sent and the business will contact you about payment.";
        await db.updateTable("serviceBookings").set({ checkoutMode: "enquiry", amountDue: "0" }).where("code", "=", code).execute();
      } else {
        const reference = `bk-${code}-${nanoid(6)}`.replace(/[^A-Za-z0-9-]/g, "");
        const back = `${origin}/store/${business.slug}/booking/${code}`;
        const started = await initCheckout(gateway.provider as GatewayProvider, await decryptSecret(gateway.secretEnc), {
          reference,
          amount: amounts.due as number,
          currency: business.currency,
          email,
          name: input.name,
          phone: phone || undefined,
          title: `${service.name} — ${business.name}`,
          description: amounts.mode === "deposit" ? `Deposit for ${service.name}` : `Payment for ${service.name}`,
          returnUrl: back,
          cancelUrl: back,
        });
        if (started.ok) {
          paymentUrl = started.url;
          await db.updateTable("serviceBookings").set({ paymentProvider: gateway.provider, paymentReference: reference, providerRef: started.providerRef ?? null }).where("code", "=", code).execute();
        } else {
          message = `We could not open the payment page (${started.error}) Your booking was saved. You can try paying again from your booking page.`;
          await db.updateTable("serviceBookings").set({ paymentProvider: gateway.provider }).where("code", "=", code).execute();
        }
      }
    }

    await runEmailAutomation(business.id, "booking_received", { email, name: input.name }, { order: code, service: service.name }, origin);
    return new Response(superjson.stringify({ code, paymentUrl, message } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not make the booking.", 400);
  }
}
