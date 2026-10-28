import superjson from "superjson";
import type { PaymentStatus } from "../../helpers/schema";

export type AdminPayment = {
  id: string;
  businessName: string;
  businessSlug: string;
  txRef: string;
  amount: number;
   10	  currency: string;
   11	  status: PaymentStatus;
   12	  periodEnd: Date | null;
   13	  createdAt: Date;
   14	};
   15	
   16	export type OutputType = { payments: AdminPayment[] };
   17	
   18	export const getAdminPayments = async (
   19	  init?: RequestInit,
   20	): Promise<OutputType> => {
   21	  const result = await fetch(`/_api/admin/payments`, {
   22	    method: "GET",
   23	    ...init,
   24	    headers: {
   25	      "Content-Type": "application/json",
   26	      ...(init?.headers ?? {}),
   27	    },
   28	  });
   29	  if (!result.ok) {
   30	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   31	    throw new Error(errorObject.error);
   32	  }
   33	  return superjson.parse<OutputType>(await result.text());
   34	};
