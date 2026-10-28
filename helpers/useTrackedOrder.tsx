import { useQuery } from "@tanstack/react-query";
import { getTrackedOrder } from "../endpoints/track_GET.schema";

export const useTrackedOrder = (code: string | undefined) =>
  useQuery({
    queryKey: ["track", code],
    queryFn: () => getTrackedOrder({ code: code as string }),
    enabled: Boolean(code),
    retry: false,
   10	  });
