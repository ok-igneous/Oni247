import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postBlogSettings } from "../endpoints/blog/settings_POST.schema";
import { MY_BUSINESS_QUERY_KEY } from "./useMyBusiness";

export const useBlogSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => postBlogSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_BUSINESS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["storefront"] });
    },
  });
};
