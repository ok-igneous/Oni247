import superjson from "superjson";

export type OutputType = {
  businessCount: number;
  publishedCount: number;
  suspendedCount: number;
  ownerCount: number;
  productCount: number;
  orderCount: number;
   10	  orderValue: number;
   11	  premiumActiveCount: number;
   12	  lapsedCount: number;
   13	  trialCount: number;
   14	  subscriptionRevenue: number;
   15	  currency: string;
   16	};
   17	
   18	export const getAdminOverview = async (
   19	  init?: RequestInit,
   20	): Promise<OutputType> => {
   21	  const result = await fetch(`/_api/admin/overview`, {
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
