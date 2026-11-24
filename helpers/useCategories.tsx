import { useQuery } from "@tanstack/react-query";
import { getCategories } from "../endpoints/categories/list_GET.schema";

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

export const useCategories = (enabled: boolean = true) =>
  useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: () => getCategories(),
    enabled,
    retry: false,
  });
