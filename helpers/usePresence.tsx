import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPresence } from "../endpoints/presence/list_GET.schema";
import { postSavePresence } from "../endpoints/presence/save_POST.schema";
import { postDeletePresence } from "../endpoints/presence/delete_POST.schema";

const KEY = ["presence"] as const;

export const usePresence = () => {
  const queryClient = useQueryClient();
   10	  const invalidate = () => {
   11	    void queryClient.invalidateQueries({ queryKey: KEY });
   12	    void queryClient.invalidateQueries({ queryKey: ["storefront"] });
   13	  };
   14	
   15	  const list = useQuery({ queryKey: KEY, queryFn: () => getPresence(), retry: false });
   16	  const save = useMutation({ mutationFn: postSavePresence, onSuccess: invalidate });
   17	  const remove = useMutation({ mutationFn: postDeletePresence, onSuccess: invalidate });
   18	
   19	  return { list, save, remove };
   20	};
