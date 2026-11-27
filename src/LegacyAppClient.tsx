"use client";

import dynamic from "next/dynamic";

const LegacyAppRuntime = dynamic(() => import("./LegacyAppRuntime"), {
  ssr: false,
  loading: () => (
    <main className="app-loading" role="status" aria-label="Loading page">
      <span className="app-loading__sr-label">Loading</span>
    </main>
  ),
});

export default function LegacyAppClient() {
  return <LegacyAppRuntime />;
}
