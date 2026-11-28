"use client";

import { Suspense } from "react";
import DashboardPage from "../../../../legacy-pages/dashboard.plan";

export default function Page() {
  return (
    <Suspense fallback={<main role="status">Loading dashboard page…</main>}>
      <DashboardPage />
    </Suspense>
  );
}
