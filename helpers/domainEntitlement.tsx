import { db } from "./db";
import { loadPlanConfig } from "./planConfig";
import { subscriptionPlan } from "./subscriptionPlan";

/**
 * Custom domains are a paid-subscription entitlement, not a trial entitlement.
 * The subscription is resolved from the owner’s server-side business record.
 */
export async function hasPaidCustomDomainAccess(ownerId: number): Promise<boolean> {
  const business = await db.selectFrom("businesses")
    .selectAll()
    .where("ownerId", "=", ownerId)
    .limit(1)
    .executeTakeFirst();

  if (!business) return false;
  await loadPlanConfig();
  return subscriptionPlan.resolve(business).source === "paid";
}
