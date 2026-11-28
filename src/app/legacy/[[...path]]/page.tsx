import LegacyAppClient from "../../../LegacyAppClient";

/** Temporary compatibility surface for routes not yet migrated to App Router. */
export const dynamic = "force-dynamic";

export default function LegacyCompatibilityPage() {
  return <LegacyAppClient />;
}
