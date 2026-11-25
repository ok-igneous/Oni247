import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { activateSubscription } from "../../helpers/activateSubscription";
import { flutterwaveEnv } from "../../helpers/flutterwaveEnv";
import { schema, type OutputType } from "./verify_POST.schema";

export async function handle(request: Request) {
  const secretKey = (await flutterwaveEnv()).secretKey;
  if (!secretKey) {
    return new Response(
      superjson.stringify({ error: "Payments are not configured yet." }),
      { status: 503 },
    );
  }

  let businessId: string;
  try {
    const { business } = await requireOwnedBusiness(request);
    businessId = business.id;
  } catch {
    return new Response(superjson.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  try {
    const json = superjson.parse(await request.text());
    const input = schema.parse(json);

    // The tx_ref comes back through the browser, so confirm it is one of THIS
    // shop's payments before touching anything.
    const payment = await db
      .selectFrom("subscriptionPayments")
      .select(["id", "status", "amount", "currency", "websitePlan", "durationMonths"])
      .where("txRef", "=", input.txRef)
      .where("businessId", "=", businessId)
      .limit(1)
      .executeTakeFirst();

    if (!payment) {
      return new Response(
        superjson.stringify({ error: "That payment was not found." }),
        { status: 404 },
      );
    }

    if (payment.status === "successful") {
      return new Response(
        superjson.stringify({
          activated: false,
          message: "This payment has already been applied.",
        } satisfies OutputType),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // Never trust the redirect's query string about success — ask Flutterwave.
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(input.transactionId)}/verify`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );

    const payload = (await response.json()) as {
      status?: string;
      data?: {
        status?: string;
        amount?: number;
        currency?: string;
        tx_ref?: string;
        id?: number;
      };
    };

    const tx = payload.data;

    if (!response.ok || payload.status !== "success" || !tx) {
      return new Response(
        superjson.stringify({
          activated: false,
          message: "We could not confirm that payment with Flutterwave yet.",
        } satisfies OutputType),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // The verified transaction must be the one we started.
    if (tx.tx_ref !== input.txRef || tx.status !== "successful" || Number(tx.amount ?? 0) < Number.parseFloat(payment.amount) || String(tx.currency ?? "") !== payment.currency) {
      return new Response(
        superjson.stringify({
          activated: false,
          message: "That payment did not complete.",
        } satisfies OutputType),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await activateSubscription({
      txRef: input.txRef,
      providerTransactionId: tx.id ? String(tx.id) : null,
      amountPaid: Number(tx.amount ?? 0),
      currency: String(tx.currency ?? ""),
    });

    return new Response(
      superjson.stringify({
        activated: result.activated,
        message: result.activated
          ? payment.websitePlan.startsWith("addon:")
            ? "Add-on is active. Thank you."
            : "Premium is active. Thank you."
          : result.reason === "ALREADY_APPLIED"
            ? "This payment has already been applied."
            : "That payment could not be applied. Contact support.",
      } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not verify the payment.";
    return new Response(superjson.stringify({ error: message }), {
      status: 400,
    });
  }
}
