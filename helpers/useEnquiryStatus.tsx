import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postEnquiryStatus } from "../endpoints/enquiries/status_POST.schema";
import { ENQUIRIES_QUERY_KEY } from "./useEnquiries";

export const useEnquiryStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => postEnquiryStatus(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENQUIRIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
    },
  });
};
