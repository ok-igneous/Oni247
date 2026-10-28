import { useQuery } from "@tanstack/react-query";
import { getEnquiries } from "../endpoints/enquiries/list_GET.schema";

export const ENQUIRIES_QUERY_KEY = ["enquiries"] as const;

export const useEnquiries = () =>
  useQuery({
    queryKey: ENQUIRIES_QUERY_KEY,
    queryFn: () => getEnquiries(),
   10	    retry: false,
   11	  });
