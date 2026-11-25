import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPresence } from "../endpoints/presence/list_GET.schema";
import { postSavePresence } from "../endpoints/presence/save_POST.schema";
import { postDeletePresence } from "../endpoints/presence/delete_POST.schema";

const KEY = ["presence"] as const;

export const usePresence = () => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: KEY });
    void queryClient.invalidateQueries({ queryKey: ["storefront"] });
  };

  const list = useQuery({ queryKey: KEY, queryFn: () => getPresence(), retry: false });
  const save = useMutation({ mutationFn: (input: Parameters<typeof postSavePresence>[0]) => postSavePresence(input), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (input: Parameters<typeof postDeletePresence>[0]) => postDeletePresence(input), onSuccess: invalidate });

  return { list, save, remove };
};
