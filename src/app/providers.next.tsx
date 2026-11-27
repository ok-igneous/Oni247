"use client";

import type { ReactNode } from "react";
import { GlobalContextProviders } from "../../components/_globalContextProviders";

export default function Providers({ children }: { children: ReactNode }) {
  return <GlobalContextProviders>{children}</GlobalContextProviders>;
}
