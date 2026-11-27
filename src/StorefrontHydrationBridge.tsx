"use client";

import { useEffect, useState } from "react";
import LegacyAppClient from "./LegacyAppClient";

/**
 * The first response contains the server-rendered storefront HTML. After
 * hydration, the existing interactive storefront takes over until its
 * remaining client features are migrated to native App Router components.
 */
export default function StorefrontHydrationBridge({ html }: { html: string }) {
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    setInteractive(true);
  }, []);

  if (interactive) return <LegacyAppClient />;

  return <div id="oni247-storefront-server" dangerouslySetInnerHTML={{ __html: html }} />;
}
