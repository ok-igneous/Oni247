import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBookings } from "../endpoints/bookings/list_GET.schema";
import { postUpdateBooking } from "../endpoints/bookings/update_POST.schema";
import { getGateways } from "../endpoints/payments/gateways_GET.schema";
import { postGateway } from "../endpoints/payments/gateways_POST.schema";

const BOOKINGS = ["bookings"] as const;
const GATEWAYS = ["payment-gateways"] as const;

export const useBookings = () => useQuery({ queryKey: BOOKINGS, queryFn: () => getBookings(), retry: false });
export const useUpdateBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: postUpdateBooking, onSettled: () => void queryClient.invalidateQueries({ queryKey: BOOKINGS }) });
};
export const useGateways = () => useQuery({ queryKey: GATEWAYS, queryFn: () => getGateways(), retry: false });
export const useGatewayAction = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: postGateway, onSettled: () => void queryClient.invalidateQueries({ queryKey: GATEWAYS }) });
};
