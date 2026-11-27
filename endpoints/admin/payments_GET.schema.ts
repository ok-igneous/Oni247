import superjson from "superjson";
import type { PaymentStatus } from "../../helpers/schema";

export type AdminPayment = {
  id: string;
  businessName: string;
  businessSlug: string;
  txRef: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  periodEnd: Date | null;
  createdAt: Date;
};

export type OutputType = { payments: AdminPayment[] };

export const getAdminPayments = async (
  init?: RequestInit,
): Promise<OutputType> => {
  const result = await fetch(`/_api/admin/payments`, {
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
