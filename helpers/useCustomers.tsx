import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCustomers } from "../endpoints/customers/list_GET.schema";
import { postCustomerNotes } from "../endpoints/customers/notes_POST.schema";

export const CUSTOMERS_QUERY_KEY = ["customers"] as const;

export const useCustomers = () =>
  useQuery({
    queryKey: CUSTOMERS_QUERY_KEY,
    queryFn: () => getCustomers(),
    retry: false,
  });

export const useCustomerNotes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => postCustomerNotes(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY }),
  });
};