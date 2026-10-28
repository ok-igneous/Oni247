import { useQuery } from "@tanstack/react-query";
import { getOrders } from "../endpoints/orders/list_GET.schema";

export const ORDERS_QUERY_KEY = ["orders"] as const;

export const useOrders = () =>
  useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: () => getOrders(),
   10	    retry: false,
   11	  });
