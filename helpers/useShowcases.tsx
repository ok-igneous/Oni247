import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getShowcases } from "../endpoints/showcases/list_GET.schema";
import { postSaveShowcase } from "../endpoints/showcases/save_POST.schema";
import { postDeleteShowcase } from "../endpoints/showcases/delete_POST.schema";

const KEY = ["showcases"] as const;

export const useShowcases = () => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: KEY });
  };

  const list = useQuery({
    queryKey: KEY,
    queryFn: () => getShowcases(),
    retry: false,
  });

  const save = useMutation({ mutationFn: (input: Parameters<typeof postSaveShowcase>[0]) => postSaveShowcase(input), onSuccess: invalidate });
  const remove = useMutation({
    mutationFn: (input: Parameters<typeof postDeleteShowcase>[0]) => postDeleteShowcase(input),
    onSuccess: invalidate,
  });

  return { list, save, remove };
};
