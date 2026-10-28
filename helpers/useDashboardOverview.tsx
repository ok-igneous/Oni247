import { useQuery } from "@tanstack/react-query";
import { getDashboardOverview } from "../endpoints/dashboard/overview_GET.schema";

export const useDashboardOverview = () =>
  useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () => getDashboardOverview(),
    retry: false,
  });
