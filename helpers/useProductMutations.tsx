import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postSaveProduct } from "../endpoints/products/save_POST.schema";
import { postDeleteProduct } from "../endpoints/products/delete_POST.schema";
import { PRODUCTS_QUERY_KEY } from "./useProducts";

export const useProductMutations = () => {
  const queryClient = useQueryClient();

  const invalidate = () => {
   10	    queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
   11	    queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
   12	    queryClient.invalidateQueries({ queryKey: ["storefront"] });
   13	  };
   14	
   15	  const save = useMutation({
   16	    mutationFn: postSaveProduct,
   17	    onSuccess: invalidate,
   18	  });
   19	
   20	  const remove = useMutation({
   21	    mutationFn: postDeleteProduct,
   22	    onSuccess: invalidate,
   23	  });
   24	
   25	  return { save, remove };
   26	};
