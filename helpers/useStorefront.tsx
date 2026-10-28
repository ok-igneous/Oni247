import { useQuery } from "@tanstack/react-query";
import { getStorefront } from "../endpoints/storefront_GET.schema";

export const useStorefront = (slug: string | undefined) =>
  useQuery({
    queryKey: ["storefront", slug],
    queryFn: () => getStorefront({ slug: slug as string }),
    enabled: Boolean(slug),
    retry: false,
   10	  });
