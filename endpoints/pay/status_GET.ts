import superjson from "superjson";
import { db } from "../../helpers/db";
import { refreshLinkPayment } from "../../helpers/linkPayments";
import type { OutputType } from "./status_GET.schema";

const fail = (error: string, status: number) => new Response(superjson.stringify({ error }), { status });

export async function handle(request: Request) {
  try {
    const ref = new URL(request.url).searchParams.get("ref") ?? "";
    if (!/^pl-[A-Za-z0-9-]{6,40}$/.test(ref)) return fail("Payment not found.", 404);
    const payment = await db.selectFrom("linkPayments").innerJoin("paymentLinks", "paymentLinks.id", "linkPayments.linkId").select(["linkPayments.id", "linkPayments.businessId", "linkPayments.reference", "linkPayments.providerRef", "linkPayments.provider", "linkPayments.amount", "linkPayments.currency", "linkPayments.status", "paymentLinks.title"]).where("linkPayments.reference", "=", ref).executeTakeFirst();
    if (!payment) return fail("Payment not found.", 404);
    // The gateway decides. Nothing in the address bar can mark a payment paid.
    const status = await refreshLinkPayment(payment);
    return new Response(superjson.stringify({ status, amount: Number.parseFloat(payment.amount), currency: payment.currency, title: payment.title } satisfies OutputType), { headers: { "Content-Type": "application/json" } });
  } catch {
    return fail("Could not check the payment.", 500);
  }
}
