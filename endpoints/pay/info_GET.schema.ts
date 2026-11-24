import superjson from "superjson";

export type PayInfo = {
  business: { name: string; slug: string; logoUrl: string | null; whatsappNumber: string | null };
  title: string;
  description: string;
  /** null: the payer chooses the amount. */
  amount: number | null;
  currency: string;
  /** False when the shop has no live payment gateway or the link is switched off. */
  available: boolean;
};

export const getPayInfo = async (code: string, init?: RequestInit): Promise<PayInfo> => {
  const result = await fetch(`/_api/pay/info?code=${encodeURIComponent(code)}`, { method: "GET", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<PayInfo>(await result.text());
};
