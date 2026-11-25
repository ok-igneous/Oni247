import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postSaveCategory } from "../endpoints/categories/save_POST.schema";
import { postDeleteCategory } from "../endpoints/categories/delete_POST.schema";
import { CATEGORIES_QUERY_KEY } from "./useCategories";

export const useCategoryMutations = () => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
    queryClient.invalidateQueries({ queryKey: ["storefront"] });
  };

  const save = useMutation({
    mutationFn: postSaveCategory,
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: postDeleteCategory,
    onSuccess: invalidate,
  });

  return { save, remove };
};
