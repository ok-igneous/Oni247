import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postSaveBusiness } from "../endpoints/business/save_POST.schema";
import { MY_BUSINESS_QUERY_KEY } from "./useMyBusiness";

export const useSaveBusiness = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => postSaveBusiness(input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: MY_BUSINESS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: ["storefront", result.business.slug],
      });
    },
  });
};
