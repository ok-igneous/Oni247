"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** React Router-compatible search-param setter for client components being moved to the App Router. */
export function useNextSearchParams() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const setParams = useCallback((
    next: string | Array<[string, string]> | Record<string, string> | URLSearchParams,
    options?: { replace?: boolean },
  ) => {
    const query = new URLSearchParams(next).toString();
    const href = query ? `${pathname}?${query}` : pathname;
    if (options?.replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }, [pathname, router]);

  return [params, setParams] as const;
}
