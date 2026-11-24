import superjson from "superjson";

export type Transaction = {
  id: string;
  kind: "order" | "booking" | "link";
  label: string;
  customer: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
  provider: string | null;
  at: Date;
};
export type OutputType = {
  currency: string;
  receivedTotal: number;
  receivedThisMonth: number;
  pendingTotal: number;
  items: Transaction[];
};

export const getTransactions = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/payments/transactions`, { method: "GET", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
