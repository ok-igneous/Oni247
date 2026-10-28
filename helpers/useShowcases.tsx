import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getShowcases } from "../endpoints/showcases/list_GET.schema";
import { postSaveShowcase } from "../endpoints/showcases/save_POST.schema";
import { postDeleteShowcase } from "../endpoints/showcases/delete_POST.schema";

const KEY = ["showcases"] as const;

export const useShowcases = () => {
  const queryClient = useQueryClient();
   10	  const invalidate = () => {
   11	    void queryClient.invalidateQueries({ queryKey: KEY });
   12	  };
   13	
   14	  const list = useQuery({
   15	    queryKey: KEY,
   16	    queryFn: () => getShowcases(),
   17	    retry: false,
   18	  });
   19	
   20	  const save = useMutation({ mutationFn: postSaveShowcase, onSuccess: invalidate });
   21	  const remove = useMutation({
   22	    mutationFn: postDeleteShowcase,
   23	    onSuccess: invalidate,
   24	  });
   25	
   26	  return { list, save, remove };
   27	};
