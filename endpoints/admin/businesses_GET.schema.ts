import superjson from "superjson";
import type { BusinessStatus, PlanTier } from "../../helpers/schema";

export type AdminBusiness = {
  id: string;
  name: string;
  slug: string;
  status: BusinessStatus;
  plan: PlanTier;
   10	  planRenewsAt: Date | null;
   11	  trialEndsAt: Date | null;
   12	  isDemo: boolean;
   13	  createdAt: Date;
   14	  ownerEmail: string;
   15	  ownerName: string;
   16	  productCount: number;
   17	  orderCount: number;
   18	};
   19	
   20	export type OutputType = { businesses: AdminBusiness[] };
   21	
   22	export const getAdminBusinesses = async (
   23	  init?: RequestInit,
   24	): Promise<OutputType> => {
   25	  const result = await fetch(`/_api/admin/businesses`, {
   26	    method: "GET",
   27	    ...init,
   28	    headers: {
   29	      "Content-Type": "application/json",
   30	      ...(init?.headers ?? {}),
   31	    },
   32	  });
   33	  if (!result.ok) {
   34	    const errorObject = superjson.parse<{ error: string }>(await result.text());
   35	    throw new Error(errorObject.error);
   36	  }
   37	  return superjson.parse<OutputType>(await result.text());
   38	};
