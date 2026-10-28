import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postUpdateOrder } from "../endpoints/orders/update_POST.schema";
import { postCreateOrder } from "../endpoints/orders/create_POST.schema";
import { postDeleteOrder } from "../endpoints/orders/delete_POST.schema";
import { ORDERS_QUERY_KEY } from "./useOrders";

export const useOrderMutations = () => {
  const queryClient = useQueryClient();

   10	  const invalidate = () => {
   11	    queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
   12	    queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
   13	    queryClient.invalidateQueries({ queryKey: ["track"] });
   14	  };
   15	
   16	  const update = useMutation({ mutationFn: postUpdateOrder, onSuccess: invalidate });
   17	  const create = useMutation({ mutationFn: postCreateOrder, onSuccess: invalidate });
   18	  const remove = useMutation({ mutationFn: postDeleteOrder, onSuccess: invalidate });
   19	
   20	  return { update, create, remove };
   21	};
