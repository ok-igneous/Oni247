import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postSaveProduct } from "../endpoints/products/save_POST.schema";
import { postDeleteProduct } from "../endpoints/products/delete_POST.schema";
import { PRODUCTS_QUERY_KEY } from "./useProducts";

export const useProductMutations = () => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
    queryClient.invalidateQueries({ queryKey: ["storefront"] });
  };

  const save = useMutation({
    mutationFn: (input) => postSaveProduct(input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (input) => postDeleteProduct(input),
    onSuccess: invalidate,
  });

  return { save, remove };
};
