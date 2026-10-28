import superjson from "superjson";

export type OutputType =
  | { hasBusiness: false }
  | {
      hasBusiness: true;
      businessName: string;
      slug: string;
      status: string;
   10	      productCount: number;
   11	      categoryCount: number;
   12	      newEnquiryCount: number;
   13	      pendingOrderCount: number;
   14	    };
   15	
   16	export const getDashboardOverview = async (
   17	  init?: RequestInit,
   18	): Promise<OutputType> => {
   19	  const result = await fetch(`/_api/dashboard/overview`, {
   20	    method: "GET",
   21	    ...init,
   22	    headers: {
   23	      "Content-Type": "application/json",
   24	      ...(init?.headers ?? {}),
   25	    },
   26	  });
   27	  if (!result.ok) {
   28	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   29	    throw new Error(errorObject.error);
   30	  }
   31	  return superjson.parse<OutputType>(await result.text());
   32	};
