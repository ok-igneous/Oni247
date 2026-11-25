import superjson from "superjson";

export type BookingRow = {
  id: string;
  code: string;
  serviceName: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  location: string | null;
  notes: string | null;
  currency: string;
  amountTotal: number;
  amountDue: number;
  checkoutMode: string;
  status: string;
  paymentStatus: string;
  paymentProvider: string | null;
  ownerNote: string | null;
  paidAt: Date | null;
  createdAt: Date;
};
export type OutputType = { bookings: BookingRow[]; paidTotal: number; currency: string };

export const getBookings = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/bookings/list`, { method: "GET", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
