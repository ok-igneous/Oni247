import { useQuery } from "@tanstack/react-query";
import { getMyBusiness } from "../endpoints/business/me_GET.schema";

export const MY_BUSINESS_QUERY_KEY = ["business", "me"] as const;

export const useMyBusiness = () =>
  useQuery({
    queryKey: MY_BUSINESS_QUERY_KEY,
    queryFn: () => getMyBusiness(),
   10	    retry: false,
   11	  });
