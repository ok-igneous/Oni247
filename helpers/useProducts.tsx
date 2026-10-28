import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../endpoints/products/list_GET.schema";

export const PRODUCTS_QUERY_KEY = ["products"] as const;

export const useProducts = (enabled: boolean = true) =>
  useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: () => getProducts(),
   10	    enabled,
   11	    retry: false,
   12	  });
