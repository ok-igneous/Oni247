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
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
