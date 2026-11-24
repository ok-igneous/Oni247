import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getOwnerComments } from "../endpoints/engagement/ownerComments_GET.schema";
import { postModerateComments } from "../endpoints/engagement/moderate_POST.schema";
import { postEngagementSettings } from "../endpoints/engagement/settings_POST.schema";
import { MY_BUSINESS_QUERY_KEY } from "./useMyBusiness";

const KEY = ["owner-comments"] as const;

export const useOwnerComments = () =>
  useQuery({ queryKey: KEY, queryFn: () => getOwnerComments(), retry: false });

export const useModerateComments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postModerateComments,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      void queryClient.invalidateQueries({ queryKey: ["engagement"] });
    },
  });
};

export const useSaveEngagementSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postEngagementSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_BUSINESS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["engagement"] });
    },
  });
};
