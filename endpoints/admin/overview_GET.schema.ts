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
    const body = await result.text();
    let message: string | undefined;
    const readMessage = (value: unknown): string | undefined => {
      if (!value || typeof value !== "object") return undefined;
      const record = value as Record<string, unknown>;
      if (typeof record.error === "string") return record.error;
      if (typeof record.message === "string") return record.message;
      return undefined;
    };
    try { message = readMessage(superjson.parse<unknown>(body)); } catch { /* non-SuperJSON response */ }
    if (!message) {
      try { message = readMessage(JSON.parse(body) as unknown); } catch { /* non-JSON response */ }
    }
    throw new Error(message || `Request failed (HTTP ${result.status}). Please try again.`);
  }
  return superjson.parse<OutputType>(await result.text());
};
