import superjson from "superjson";
import { nanoid } from "nanoid";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import { subscriptionPlan } from "../../helpers/subscriptionPlan";
import { flutterwaveEnv } from "../../helpers/flutterwaveEnv";
import { schema, type OutputType } from "./checkout_POST.schema";

export async function handle(request: Request) {
   10	  const secretKey = flutterwaveEnv().secretKey;
   11	  if (!secretKey) {
   12	    return new Response(
   13	      superjson.stringify({
   14	        error: "Payments are not configured yet. Please try again shortly.",
   15	      }),
   16	      { status: 503 },
   17	    );
   18	  }
   19	
   20	  let business;
   21	  let userEmail: string;
   22	  try {
   23	    const session = await requireOwnedBusiness(request);
   24	    business = session.business;
   25	    userEmail = session.user.email;
   26	  } catch {
   27	    return new Response(superjson.stringify({ error: "Not authenticated" }), {
   28	      status: 401,
   29	    });
   30	  }
   31	
   32	  try {
   33	    const input = schema.parse(superjson.parse(await request.text()));
   34	    const promo = !business.registrationPromoUsed;
   35	    // The price is decided HERE, from the server's own constants. Nothing about
   36	    // the amount comes from the browser.
   37	    const amount = subscriptionPlan.priceFor(input.websitePlan,input.durationMonths,promo);
   38	    const currency = subscriptionPlan.currency;
   39	    const txRef = `oniduka-${business.id.slice(0, 8)}-${nanoid(12)}`;
   40	
   41	    await db
   42	      .insertInto("subscriptionPayments")
   43	      .values({
   44	        businessId: business.id,
   45	        provider: "flutterwave",
   46	        txRef,
   47	        amount: amount.toFixed(2),
   48	        currency,
   49	        websitePlan: input.websitePlan,
   50	        durationMonths: input.durationMonths,
   51	        promoApplied: promo,
   52	        status: "pending",
   53	      })
   54	      .executeTakeFirstOrThrow();
   55	
   56	    const origin = new URL(request.url).origin;
   57	
   58	    const response = await fetch("https://api.flutterwave.com/v3/payments", {
   59	      method: "POST",
   60	      headers: {
   61	        Authorization: `Bearer ${secretKey}`,
   62	        "Content-Type": "application/json",
   63	      },
   64	      body: JSON.stringify({
   65	        tx_ref: txRef,
   66	        amount,
   67	        currency,
   68	        redirect_url: `${origin}/dashboard/plan`,
   69	        payment_options: "card,banktransfer,ussd",
   70	        customer: {
   71	          email: userEmail,
   72	          name: business.name,
   73	          phonenumber: business.phone ?? undefined,
   74	        },
   75	        customizations: {
   76	          title: input.websitePlan === "premium_plus" ? "Oniduka Premium Plus" : "Oniduka One-Page Website",
   77	          description: `${input.websitePlan === "premium_plus" ? "Premium Plus multi-page website" : "One-page website"} — ${input.durationMonths} month${input.durationMonths === 1 ? "" : "s"}${promo ? " — 50% registration promo" : ""}`,
   78	        },
   79	      }),
   80	    });
   81	
   82	    const payload = (await response.json()) as {
   83	      status?: string;
   84	      message?: string;
   85	      data?: { link?: string };
   86	    };
   87	
   88	    if (!response.ok || payload.status !== "success" || !payload.data?.link) {
   89	      await db
   90	        .updateTable("subscriptionPayments")
   91	        .set({ status: "failed", updatedAt: new Date() })
   92	        .where("txRef", "=", txRef)
   93	        .execute();
   94	
   95	      return new Response(
   96	        superjson.stringify({
   97	          error: payload.message ?? "Could not start the payment. Try again.",
   98	        }),
   99	        { status: 502 },
  100	      );
  101	    }
  102	
  103	    return new Response(
  104	      superjson.stringify({
  105	        paymentLink: payload.data.link,
  106	        txRef,
  107	      } satisfies OutputType),
  108	      { headers: { "Content-Type": "application/json" } },
  109	    );
  110	  } catch (error) {
  111	    const message =
  112	      error instanceof Error ? error.message : "Could not start the payment.";
  113	    return new Response(superjson.stringify({ error: message }), {
  114	      status: 500,
  115	    });
  116	  }
  117	}
