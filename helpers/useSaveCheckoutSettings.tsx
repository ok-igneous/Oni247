import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postCheckoutSettings } from "../endpoints/business/checkoutSettings_POST.schema";
import { MY_BUSINESS_QUERY_KEY } from "./useMyBusiness";

export const useSaveCheckoutSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => postCheckoutSettings(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_BUSINESS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
    },
  });
};
