import { db } from "./db";

/**
 * Marks a payment successful and extends the business's premium period.
 *
 * Idempotent on purpose: the redirect-back and the webhook both call this for
 * the same payment, and either may arrive first or twice. Only a row that is
 * still 'pending' causes an extension, so a shop can never be given 60 days
 * for one payment.
   10	 */
   11	export const activateSubscription = async (params: {
   12	  txRef: string;
   13	  providerTransactionId: string | null;
   14	  amountPaid: number;
   15	  currency: string;
   16	}): Promise<{ activated: boolean; reason?: string }> => {
   17	  return db.transaction().execute(async (trx) => {
   18	    const payment = await trx
   19	      .selectFrom("subscriptionPayments")
   20	      .selectAll()
   21	      .where("txRef", "=", params.txRef)
   22	      // Locks the row for the length of the transaction so a webhook and a
   23	      // redirect arriving together cannot both extend the plan.
   24	      .forUpdate()
   25	      .limit(1)
   26	      .executeTakeFirst();
   27	
   28	    if (!payment) {
   29	      return { activated: false, reason: "UNKNOWN_PAYMENT" };
   30	    }
   31	
   32	    if (payment.status === "successful") {
   33	      return { activated: false, reason: "ALREADY_APPLIED" };
   34	    }
   35	
   36	    if (payment.status !== "pending") {
   37	      return { activated: false, reason: "PAYMENT_NOT_PENDING" };
   38	    }
   39	
   40	    const expected = Number.parseFloat(payment.amount);
   41	    if (params.currency !== payment.currency || params.amountPaid < expected) {
   42	      await trx
   43	        .updateTable("subscriptionPayments")
   44	        .set({ status: "failed", updatedAt: new Date() })
   45	        .where("id", "=", payment.id)
   46	        .execute();
   47	      return { activated: false, reason: "AMOUNT_MISMATCH" };
   48	    }
   49	
   50	    const business = await trx
   51	      .selectFrom("businesses")
   52	      .select(["id", "planRenewsAt", "registrationPromoUsed"])
   53	      .where("id", "=", payment.businessId)
   54	      .forUpdate()
   55	      .limit(1)
   56	      .executeTakeFirstOrThrow();
   57	
   58	    // Only one successful payment may consume the registration discount.
   59	    if (payment.promoApplied && business.registrationPromoUsed) {
   60	      await trx
   61	        .updateTable("subscriptionPayments")
   62	        .set({ status: "failed", updatedAt: new Date() })
   63	        .where("id", "=", payment.id)
   64	        .execute();
   65	      return { activated: false, reason: "PROMO_ALREADY_USED" };
   66	    }
   67	
   68	    const now = new Date();
   69	    // Paying early stacks onto the remaining time rather than wasting it.
   70	    const start =
   71	      business.planRenewsAt && new Date(business.planRenewsAt) > now
   72	        ? new Date(business.planRenewsAt)
   73	        : now;
   74	    const periodEnd = new Date(start);
   75	    periodEnd.setMonth(periodEnd.getMonth() + payment.durationMonths);
   76	
   77	    await trx
   78	      .updateTable("businesses")
   79	      .set({ plan: "premium", websitePlan: payment.websitePlan, planRenewsAt: periodEnd, registrationPromoUsed: true, updatedAt: now })
   80	      .where("id", "=", business.id)
   81	      .execute();
   82	
   83	    await trx
   84	      .updateTable("subscriptionPayments")
   85	      .set({
   86	        status: "successful",
   87	        providerTransactionId: params.providerTransactionId,
   88	        periodStart: start,
   89	        periodEnd,
   90	        updatedAt: now,
   91	      })
   92	      .where("id", "=", payment.id)
   93	      .execute();
   94	
   95	    return { activated: true };
   96	  });
   97	};
