import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

type HostStorefrontState = { slug: string | null; resolved: boolean };
const HostStorefrontContext = createContext<HostStorefrontState>({ slug: null, resolved: false });

export function StorefrontHostProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HostStorefrontState>({ slug: null, resolved: false });

  useEffect(() => {
    let active = true;
    const host = window.location.hostname.toLowerCase();
    void fetch("/_api/storefrontHost", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ slug?: string | null }>;
      })
      .then((result) => {
        if (active) setState({ slug: result?.slug ?? null, resolved: true });
      })
      .catch(() => {
        if (active) setState({ slug: null, resolved: true });
      });
    return () => { active = false; };
  }, []);

  return <StorefrontHostContext.Provider value={state}>{children}</StorefrontHostContext.Provider>;
}

/** Route params take precedence; host-resolved slug supplies the missing segment on domain-root routes. */
export function useStorefrontRouteParams<T extends Record<string, string | undefined>>() {
  const params = useParams<T>();
  const host = useContext(StorefrontHostContext);
  return useMemo(() => ({ ...params, slug: params.slug || host.slug || undefined }), [params, host.slug]) as T & { slug: string | undefined };
}

export function useStorefrontHost() {
  return useContext(StorefrontHostContext);
}
