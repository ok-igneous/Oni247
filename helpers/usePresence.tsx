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
  const save = useMutation({ mutationFn: postSavePresence, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: postDeletePresence, onSuccess: invalidate });

  return { list, save, remove };
};
