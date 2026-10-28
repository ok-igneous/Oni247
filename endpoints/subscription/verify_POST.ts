import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { activateSubscription } from "../../helpers/activateSubscription";
import { flutterwaveEnv } from "../../helpers/flutterwaveEnv";
import { schema, type OutputType } from "./verify_POST.schema";

export async function handle(request: Request) {
  const secretKey = flutterwaveEnv().secretKey;
   10	  if (!secretKey) {
   11	    return new Response(
   12	      superjson.stringify({ error: "Payments are not configured yet." }),
   13	      { status: 503 },
   14	    );
   15	  }
   16	
   17	  let businessId: string;
   18	  try {
   19	    const { business } = await requireOwnedBusiness(request);
   20	    businessId = business.id;
   21	  } catch {
   22	    return new Response(superjson.stringify({ error: "Not authenticated" }), {
   23	      status: 401,
   24	    });
   25	  }
   26	
   27	  try {
   28	    const json = superjson.parse(await request.text());
   29	    const input = schema.parse(json);
   30	
   31	    // The tx_ref comes back through the browser, so confirm it is one of THIS
   32	    // shop's payments before touching anything.
   33	    const payment = await db
   34	      .selectFrom("subscriptionPayments")
   35	      .select(["id", "status", "amount", "currency", "websitePlan", "durationMonths"])
   36	      .where("txRef", "=", input.txRef)
   37	      .where("businessId", "=", businessId)
   38	      .limit(1)
   39	      .executeTakeFirst();
   40	
   41	    if (!payment) {
   42	      return new Response(
   43	        superjson.stringify({ error: "That payment was not found." }),
   44	        { status: 404 },
   45	      );
   46	    }
   47	
   48	    if (payment.status === "successful") {
   49	      return new Response(
   50	        superjson.stringify({
   51	          activated: false,
   52	          message: "This payment has already been applied.",
   53	        } satisfies OutputType),
   54	        { headers: { "Content-Type": "application/json" } },
   55	      );
   56	    }
   57	
   58	    // Never trust the redirect's query string about success — ask Flutterwave.
   59	    const response = await fetch(
   60	      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(input.transactionId)}/verify`,
   61	      { headers: { Authorization: `Bearer ${secretKey}` } },
   62	    );
   63	
   64	    const payload = (await response.json()) as {
   65	      status?: string;
   66	      data?: {
   67	        status?: string;
   68	        amount?: number;
   69	        currency?: string;
   70	        tx_ref?: string;
   71	        id?: number;
   72	      };
   73	    };
   74	
   75	    const tx = payload.data;
   76	
   77	    if (!response.ok || payload.status !== "success" || !tx) {
   78	      return new Response(
   79	        superjson.stringify({
   80	          activated: false,
   81	          message: "We could not confirm that payment with Flutterwave yet.",
   82	        } satisfies OutputType),
   83	        { headers: { "Content-Type": "application/json" } },
   84	      );
   85	    }
   86	
   87	    // The verified transaction must be the one we started.
   88	    if (tx.tx_ref !== input.txRef || tx.status !== "successful" || Number(tx.amount ?? 0) < Number.parseFloat(payment.amount) || String(tx.currency ?? "") !== payment.currency) {
   89	      return new Response(
   90	        superjson.stringify({
   91	          activated: false,
   92	          message: "That payment did not complete.",
   93	        } satisfies OutputType),
   94	        { headers: { "Content-Type": "application/json" } },
   95	      );
   96	    }
   97	
   98	    const result = await activateSubscription({
   99	      txRef: input.txRef,
  100	      providerTransactionId: tx.id ? String(tx.id) : null,
  101	      amountPaid: Number(tx.amount ?? 0),
  102	      currency: String(tx.currency ?? ""),
  103	    });
  104	
  105	    return new Response(
  106	      superjson.stringify({
  107	        activated: result.activated,
  108	        message: result.activated
  109	          ? "Premium is active. Thank you."
  110	          : result.reason === "ALREADY_APPLIED"
  111	            ? "This payment has already been applied."
  112	            : "That payment could not be applied. Contact support.",
  113	      } satisfies OutputType),
  114	      { headers: { "Content-Type": "application/json" } },
  115	    );
  116	  } catch (error) {
  117	    const message =
  118	      error instanceof Error ? error.message : "Could not verify the payment.";
  119	    return new Response(superjson.stringify({ error: message }), {
  120	      status: 400,
  121	    });
  122	  }
  123	}
