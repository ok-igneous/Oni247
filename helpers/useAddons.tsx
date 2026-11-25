import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAddons } from "../endpoints/addons/list_GET.schema";
import { postToggleAddon } from "../endpoints/addons/toggle_POST.schema";
import { MY_BUSINESS_QUERY_KEY } from "./useMyBusiness";

const KEY = ["addons"] as const;

export const useAddons = () => useQuery({ queryKey: KEY, queryFn: () => getAddons(), retry: false });

export const useToggleAddon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => postToggleAddon(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      void queryClient.invalidateQueries({ queryKey: MY_BUSINESS_QUERY_KEY });
    },
  });
};
