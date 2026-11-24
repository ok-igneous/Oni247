import superjson from "superjson";
import type { BusinessStatus, PlanTier } from "../../helpers/schema";

export type AdminBusiness = {
  id: string;
  name: string;
  slug: string;
  status: BusinessStatus;
  plan: PlanTier;
  planRenewsAt: Date | null;
  trialEndsAt: Date | null;
  isDemo: boolean;
  createdAt: Date;
  ownerEmail: string;
  ownerName: string;
  productCount: number;
  orderCount: number;
};

export type OutputType = { businesses: AdminBusiness[] };

export const getAdminBusinesses = async (
  init?: RequestInit,
): Promise<OutputType> => {
  const result = await fetch(`/_api/admin/businesses`, {
    method: "GET",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
