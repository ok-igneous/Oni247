import LegacyAppClient from "../../../LegacyAppClient";

/**
 * Compatibility entry point for routes still owned by the legacy React Router app.
 * next.config.ts rewrites unmatched public paths to /legacy/:path*.
 */
export default function LegacyRoutePage() {
  return <LegacyAppClient />;
}
