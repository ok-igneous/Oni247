import { db } from "./db";

/**
 * Marks a payment successful and extends the business's premium period.
 *
 * Idempotent on purpose: the redirect-back and the webhook both call this for
 * the same payment, and either may arrive first or twice. Only a row that is
 * still 'pending' causes an extension, so a shop can never be given 60 days
 * for one payment.
 */
export const activateSubscription = async (params: {
  txRef: string;
  providerTransactionId: string | null;
  amountPaid: number;
  currency: string;
}): Promise<{ activated: boolean; reason?: string }> => {
  return db.transaction().execute(async (trx) => {
    const payment = await trx
      .selectFrom("subscriptionPayments")
      .selectAll()
      .where("txRef", "=", params.txRef)
      // Locks the row for the length of the transaction so a webhook and a
      // redirect arriving together cannot both extend the plan.
      .forUpdate()
      .limit(1)
      .executeTakeFirst();

    if (!payment) {
      return { activated: false, reason: "UNKNOWN_PAYMENT" };
    }

    if (payment.status === "successful") {
      return { activated: false, reason: "ALREADY_APPLIED" };
    }

    if (payment.status !== "pending") {
      return { activated: false, reason: "PAYMENT_NOT_PENDING" };
    }

    const expected = Number.parseFloat(payment.amount);
    if (params.currency !== payment.currency || params.amountPaid < expected) {
      await trx
        .updateTable("subscriptionPayments")
        .set({ status: "failed", updatedAt: new Date() })
        .where("id", "=", payment.id)
        .execute();
      return { activated: false, reason: "AMOUNT_MISMATCH" };
    }

    // A separately bought add-on extends that add-on only; the shop's plan is not touched.
    if (payment.websitePlan.startsWith("addon:")) {
      const addonId = payment.websitePlan.slice("addon:".length);
      const at = new Date();
      const existing = await trx
        .selectFrom("addonPurchases")
        .select(["id", "expiresAt"])
        .where("businessId", "=", payment.businessId)
        .where("addonId", "=", addonId)
        .forUpdate()
        .executeTakeFirst();
      const from = existing && new Date(existing.expiresAt) > at ? new Date(existing.expiresAt) : at;
      const until = new Date(from);
      until.setMonth(until.getMonth() + payment.durationMonths);
      if (existing) {
        await trx.updateTable("addonPurchases").set({ expiresAt: until, updatedAt: at }).where("id", "=", existing.id).execute();
      } else {
        await trx.insertInto("addonPurchases").values({ businessId: payment.businessId, addonId, expiresAt: until }).execute();
      }
      await trx
        .updateTable("subscriptionPayments")
        .set({ status: "successful", providerTransactionId: params.providerTransactionId, periodStart: from, periodEnd: until, updatedAt: at })
        .where("id", "=", payment.id)
        .execute();
      return { activated: true };
    }

    const business = await trx
      .selectFrom("businesses")
      .select(["id", "planRenewsAt", "registrationPromoUsed"])
      .where("id", "=", payment.businessId)
      .forUpdate()
      .limit(1)
      .executeTakeFirstOrThrow();

    // Only one successful payment may consume the registration discount.
    if (payment.promoApplied && business.registrationPromoUsed) {
      await trx
        .updateTable("subscriptionPayments")
        .set({ status: "failed", updatedAt: new Date() })
        .where("id", "=", payment.id)
        .execute();
      return { activated: false, reason: "PROMO_ALREADY_USED" };
    }

    const now = new Date();
    // Paying early stacks onto the remaining time rather than wasting it.
    const start =
      business.planRenewsAt && new Date(business.planRenewsAt) > now
        ? new Date(business.planRenewsAt)
        : now;
    const periodEnd = new Date(start);
    periodEnd.setMonth(periodEnd.getMonth() + payment.durationMonths);

    await trx
      .updateTable("businesses")
      .set({ plan: "premium", websitePlan: payment.websitePlan, planRenewsAt: periodEnd, registrationPromoUsed: true, updatedAt: now })
      .where("id", "=", business.id)
      .execute();

    await trx
      .updateTable("subscriptionPayments")
      .set({
        status: "successful",
        providerTransactionId: params.providerTransactionId,
        periodStart: start,
        periodEnd,
        updatedAt: now,
      })
      .where("id", "=", payment.id)
      .execute();

    return { activated: true };
  });
};
