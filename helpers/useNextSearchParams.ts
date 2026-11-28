"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Next.js App Router equivalent for the small query-string API used by migrated dashboard pages. */
export function useNextSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const clearSearchParams = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return [searchParams, clearSearchParams] as const;
}
