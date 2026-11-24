import superjson from "superjson";

export type PaymentLinkItem = {
  id: string;
  code: string;
  title: string;
  description: string;
  /** null means the payer chooses the amount. */
  amount: number | null;
  active: boolean;
  paidCount: number;
  paidTotal: number;
  url: string;
};
export type OutputType = { currency: string; gatewayLive: boolean; links: PaymentLinkItem[] };

export const getPaymentLinks = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/payments/links`, { method: "GET", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
