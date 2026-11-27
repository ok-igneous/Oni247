import { useQuery } from "@tanstack/react-query";
import { getStorefront, type OutputType } from "../endpoints/storefront_GET.schema";

export const useStorefront = (slug: string | undefined, initialData?: OutputType) =>
  useQuery({
    queryKey: ["storefront", slug],
    queryFn: () => getStorefront({ slug: slug as string }),
    enabled: Boolean(slug),
    retry: false,
    ...(initialData ? { initialData } : {}),
  });
