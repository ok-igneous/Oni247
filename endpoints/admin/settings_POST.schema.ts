import { z } from "zod";
import superjson from "superjson";

const num = (min: number, max: number) => z.number().finite().min(min).max(max);

export const schema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("smtp.save"),
    host: z.string().trim().min(1).max(200),
    port: z.number().int().min(1).max(65535),
    secure: z.boolean(),
    user: z.string().trim().max(200),
    /** Leave empty to keep the saved password. */
    pass: z.string().max(300).optional(),
    fromEmail: z.string().trim().email().max(200),
    fromName: z.string().trim().max(80),
    inboxDomain: z.string().trim().max(200),
    /** Leave empty to keep the saved secret. At least 16 characters when set. */
    inboundSecret: z.string().max(200).optional(),
  }),
  z.object({ op: z.literal("smtp.test") }),
  z.object({ op: z.literal("smtp.remove") }),
  z.object({
    op: z.literal("gateway.save"),
    secretKey: z.string().trim().max(300).optional(),
    webhookHash: z.string().trim().max(300).optional(),
  }),
  z.object({ op: z.literal("gateway.test") }),
  z.object({ op: z.literal("gateway.remove") }),
  z.object({
    op: z.literal("plans.save"),
    onePagePriceNgn: num(0, 10_000_000),
    premiumPlusPriceNgn: num(0, 10_000_000),
    trialDays: num(0, 365),
    registrationPromoPercent: num(0, 100),
    freeProductLimit: num(0, 100000),
    freeDailyCreationLimit: num(0, 100000),
    maxDurationMonths: num(1, 60),
  }),
  z.object({
    op: z.literal("addon.save"),
    id: z.string().min(1).max(40),
    name: z.string().trim().max(60),
    description: z.string().trim().max(300),
    access: z.enum(["free", "premium_plus"]),
    comingSoon: z.boolean(),
    hidden: z.boolean(),
  }),
  z.object({
    op: z.literal("catalog.save"),
    plans: z
      .array(
        z.object({
          id: z.string().trim().regex(/^[a-z0-9_]{2,32}$/, "Plan ids use lowercase letters, numbers and underscores."),
          name: z.string().trim().min(1).max(60),
          description: z.string().trim().max(200),
          priceMonthlyNgn: num(0, 10_000_000),
          features: z.array(z.string().max(40)).max(60),
          productLimit: z.number().int().min(0).max(1_000_000).nullable(),
          dailyCreationLimit: z.number().int().min(0).max(1_000_000).nullable(),
          highlighted: z.boolean(),
          active: z.boolean(),
          sort: z.number().int().min(0).max(1000),
        }),
      )
      .min(1)
      .max(20),
    trialPlanId: z.string().trim().max(32),
    trialDays: num(0, 365),
    registrationPromoPercent: num(0, 100),
    maxDurationMonths: num(1, 60),
  }),
  z.object({
    op: z.literal("addon.config"),
    id: z.string().min(1).max(40),
    name: z.string().trim().max(60),
    description: z.string().trim().max(300),
    freeForAll: z.boolean(),
    includedPlanIds: z.array(z.string().max(32)).max(20),
    priceMonthlyNgn: num(0, 10_000_000),
    comingSoon: z.boolean(),
    hidden: z.boolean(),
  }),
]);
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true; message?: string };

export const postAdminSettings = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const valid = schema.parse(body);
  const result = await fetch(`/_api/admin/settings`, {
    method: "POST",
    body: superjson.stringify(valid),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
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

