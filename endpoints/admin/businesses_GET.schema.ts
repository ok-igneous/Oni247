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
