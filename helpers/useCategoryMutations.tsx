import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postSaveCategory } from "../endpoints/categories/save_POST.schema";
import { postDeleteCategory } from "../endpoints/categories/delete_POST.schema";
import { CATEGORIES_QUERY_KEY } from "./useCategories";

export const useCategoryMutations = () => {
  const queryClient = useQueryClient();

  const invalidate = () => {
   10	    queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
   11	    queryClient.invalidateQueries({ queryKey: ["products"] });
   12	    queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
   13	    queryClient.invalidateQueries({ queryKey: ["storefront"] });
   14	  };
   15	
   16	  const save = useMutation({
   17	    mutationFn: postSaveCategory,
   18	    onSuccess: invalidate,
   19	  });
   20	
   21	  const remove = useMutation({
   22	    mutationFn: postDeleteCategory,
   23	    onSuccess: invalidate,
   24	  });
   25	
   26	  return { save, remove };
   27	};
