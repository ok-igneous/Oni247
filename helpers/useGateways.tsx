import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGateways } from "../endpoints/payments/gateways_GET.schema";
import { postGateway } from "../endpoints/payments/gateways_POST.schema";

const KEY = ["payment-gateways"] as const;

export const useGateways = () => useQuery({ queryKey: KEY, queryFn: () => getGateways(), retry: false });

export const useGatewayAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof postGateway>[0]) => postGateway(input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      void queryClient.invalidateQueries({ queryKey: ["storefront"] });
    },
  });
};

