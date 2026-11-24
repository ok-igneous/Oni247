import superjson from "superjson";

export type OutputType = {
  businessCount: number;
  publishedCount: number;
  suspendedCount: number;
  ownerCount: number;
  productCount: number;
  orderCount: number;
  orderValue: number;
  premiumActiveCount: number;
  lapsedCount: number;
  trialCount: number;
  subscriptionRevenue: number;
  currency: string;
};

export const getAdminOverview = async (
  init?: RequestInit,
): Promise<OutputType> => {
  const result = await fetch(`/_api/admin/overview`, {
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
