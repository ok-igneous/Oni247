import { useQuery } from "@tanstack/react-query";
import { getSubscriptionStatus } from "../endpoints/subscription/status_GET.schema";

export const SUBSCRIPTION_QUERY_KEY = ["subscription", "status"] as const;

export const useSubscriptionStatus = () =>
  useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: () => getSubscriptionStatus(),
   10	    retry: false,
   11	  });
