import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTeam } from "../endpoints/team/overview_GET.schema";
import { postTeam } from "../endpoints/team/save_POST.schema";
import { getTeamMe } from "../endpoints/team/me_GET.schema";

const KEY = ["team"] as const;

export const useTeam = () => useQuery({ queryKey: KEY, queryFn: () => getTeam(), retry: false });

export const useTeamAction = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input) => postTeam(input), onSettled: () => void queryClient.invalidateQueries({ queryKey: KEY }) });
};

/** What the signed-in person may open in this shop. The owner may open everything. */
export const useTeamAccess = () => useQuery({ queryKey: ["team", "me"], queryFn: () => getTeamMe(), retry: false, staleTime: 60_000 });

