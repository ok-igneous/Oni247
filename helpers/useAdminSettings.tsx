import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminSettings } from "../endpoints/admin/settings_GET.schema";
import { postAdminSettings } from "../endpoints/admin/settings_POST.schema";

const KEY = ["admin", "settings"] as const;

export const useAdminSettings = () => useQuery({ queryKey: KEY, queryFn: () => getAdminSettings(), retry: false });

export const useAdminSettingsAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof postAdminSettings>[0]) => postAdminSettings(input),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: KEY }),
  });
};

