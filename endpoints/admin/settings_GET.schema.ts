import { z } from "zod";
import superjson from "superjson";
import type { PlanDef } from "../../helpers/subscriptionPlan";

export type AdminAddon = {
  id: string;
  name: string;
  description: string;
  access: "free" | "premium_plus";
  comingSoon: boolean;
  hidden: boolean;
  /** Added with the add-on builder. */
  freeForAll?: boolean;
  priceMonthlyNgn?: number;
  includedPlanIds?: string[];
  feature?: string | null;
  shops?: number;
};

export type OutputType = {
  serverReady: boolean;
  smtp: {
    source: "admin" | "env";
    ready: boolean;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    hasPass: boolean;
    fromEmail: string;
    fromName: string;
    inboxDomain: string;
    hasInboundSecret: boolean;
    inboundUrl: string;
  };
  gateway: {
    source: "admin" | "env" | "none";
    hasSecret: boolean;
    hasWebhookHash: boolean;
    verified: boolean;
    webhookUrl: string;
  };
  plans: {
    onePagePriceNgn?: number;
    premiumPlusPriceNgn?: number;
    trialDays: number;
    registrationPromoPercent: number;
    freeProductLimit?: number;
    freeDailyCreationLimit?: number;
    maxDurationMonths: number;
  };
  addons: AdminAddon[];
  /** Added with the plan builder. */
  catalog?: PlanDef[];
  planSettings?: { trialPlanId: string; trialDays: number; registrationPromoPercent: number; maxDurationMonths: number };
};

export const getAdminSettings = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/admin/settings`, { method: "GET", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
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

