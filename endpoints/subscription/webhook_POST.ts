import { activateSubscription } from "../../helpers/activateSubscription";
import { flutterwaveEnv } from "../../helpers/flutterwaveEnv";

/**
 * Flutterwave webhook. This is the reliable path: the redirect back to the app
 * only fires if the customer's browser makes it home, and on a Lagos mobile
 * connection it often does not.
 */
export async function handle(request: Request) {
   10	  const { secretKey, webhookHash } = flutterwaveEnv();
   11	
   12	  // Without a configured hash anyone could post fake payments here, so refuse
   13	  // rather than trust the body.
   14	  if (!webhookHash || !secretKey) {
   15	    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
   16	      status: 503,
   17	      headers: { "Content-Type": "application/json" },
   18	    });
   19	  }
   20	
   21	  const signature = request.headers.get("verif-hash");
   22	  if (!signature || signature !== webhookHash) {
   23	    return new Response(JSON.stringify({ error: "Invalid signature" }), {
   24	      status: 401,
   25	      headers: { "Content-Type": "application/json" },
   26	    });
   27	  }
   28	
   29	  try {
   30	    const event = (await request.json()) as {
   31	      event?: string;
   32	      data?: {
   33	        id?: number;
   34	        tx_ref?: string;
   35	        status?: string;
   36	        amount?: number;
   37	        currency?: string;
   38	      };
   39	    };
   40	
   41	    const tx = event.data;
   42	
   43	    if (tx?.status === "successful" && tx.tx_ref && tx.id) {
   44	      // Re-verify against the API even though the signature checked out — the
   45	      // payload is only a notification, the API is the source of truth.
   46	      const response = await fetch(
   47	        `https://api.flutterwave.com/v3/transactions/${tx.id}/verify`,
   48	        { headers: { Authorization: `Bearer ${secretKey}` } },
   49	      );
   50	      const payload = (await response.json()) as {
   51	        status?: string;
   52	        data?: {
   53	          status?: string;
   54	          amount?: number;
   55	          currency?: string;
   56	          tx_ref?: string;
   57	          id?: number;
   58	        };
   59	      };
   60	      const verified = payload.data;
   61	
   62	      if (
   63	        response.ok &&
   64	        payload.status === "success" &&
   65	        verified?.status === "successful" &&
   66	        verified.tx_ref === tx.tx_ref
   67	      ) {
   68	        await activateSubscription({
   69	          txRef: verified.tx_ref,
   70	          providerTransactionId: verified.id ? String(verified.id) : null,
   71	          amountPaid: Number(verified.amount ?? 0),
   72	          currency: String(verified.currency ?? ""),
   73	        });
   74	      }
   75	    }
   76	
   77	    // Always 200 once the signature is valid, so Flutterwave stops retrying.
   78	    return new Response(JSON.stringify({ received: true }), {
   79	      status: 200,
   80	      headers: { "Content-Type": "application/json" },
   81	    });
   82	  } catch {
   83	    return new Response(JSON.stringify({ received: true }), {
   84	      status: 200,
   85	      headers: { "Content-Type": "application/json" },
   86	    });
   87	  }
   88	}
