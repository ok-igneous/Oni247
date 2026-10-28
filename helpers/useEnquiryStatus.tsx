import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postEnquiryStatus } from "../endpoints/enquiries/status_POST.schema";
import { ENQUIRIES_QUERY_KEY } from "./useEnquiries";

export const useEnquiryStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postEnquiryStatus,
    onSuccess: () => {
   10	      queryClient.invalidateQueries({ queryKey: ENQUIRIES_QUERY_KEY });
   11	      queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
   12	    },
   13	  });
   14	};
