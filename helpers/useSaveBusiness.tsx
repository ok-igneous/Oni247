import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postSaveBusiness } from "../endpoints/business/save_POST.schema";
import { MY_BUSINESS_QUERY_KEY } from "./useMyBusiness";

export const useSaveBusiness = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postSaveBusiness,
    onSuccess: (result) => {
   10	      queryClient.invalidateQueries({ queryKey: MY_BUSINESS_QUERY_KEY });
   11	      queryClient.invalidateQueries({
   12	        queryKey: ["storefront", result.business.slug],
   13	      });
   14	    },
   15	  });
   16	};
