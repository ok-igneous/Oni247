import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postUpdateOrder } from "../endpoints/orders/update_POST.schema";
import { postCreateOrder } from "../endpoints/orders/create_POST.schema";
import { postDeleteOrder } from "../endpoints/orders/delete_POST.schema";
import { ORDERS_QUERY_KEY } from "./useOrders";

export const useOrderMutations = () => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] });
    queryClient.invalidateQueries({ queryKey: ["track"] });
  };

  const update = useMutation({ mutationFn: (input) => postUpdateOrder(input), onSuccess: invalidate });
  const create = useMutation({ mutationFn: (input) => postCreateOrder(input), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (input) => postDeleteOrder(input), onSuccess: invalidate });

  return { update, create, remove };
};
