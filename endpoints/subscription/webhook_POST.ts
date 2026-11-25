import { activateSubscription } from "../../helpers/activateSubscription";
import { flutterwaveEnv } from "../../helpers/flutterwaveEnv";

/**
 * Flutterwave webhook. This is the reliable path: the redirect back to the app
 * only fires if the customer's browser makes it home, and on a Lagos mobile
 * connection it often does not.
 */
export async function handle(request: Request) {
  const { secretKey, webhookHash } = await flutterwaveEnv();

  // Without a configured hash anyone could post fake payments here, so refuse
  // rather than trust the body.
  if (!webhookHash || !secretKey) {
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const signature = request.headers.get("verif-hash");
  if (!signature || signature !== webhookHash) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const event = (await request.json()) as {
      event?: string;
      data?: {
        id?: number;
        tx_ref?: string;
        status?: string;
        amount?: number;
        currency?: string;
      };
    };

    const tx = event.data;

    if (tx?.status === "successful" && tx.tx_ref && tx.id) {
      // Re-verify against the API even though the signature checked out — the
      // payload is only a notification, the API is the source of truth.
      const response = await fetch(
        `https://api.flutterwave.com/v3/transactions/${tx.id}/verify`,
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
      const verified = payload.data;

      if (
        response.ok &&
        payload.status === "success" &&
        verified?.status === "successful" &&
        verified.tx_ref === tx.tx_ref
      ) {
        await activateSubscription({
          txRef: verified.tx_ref,
          providerTransactionId: verified.id ? String(verified.id) : null,
          amountPaid: Number(verified.amount ?? 0),
          currency: String(verified.currency ?? ""),
        });
      }
    }

    // Always 200 once the signature is valid, so Flutterwave stops retrying.
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
