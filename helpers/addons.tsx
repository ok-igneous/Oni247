/**
 * Add-on registry. One place that says which optional feature engines exist,
 * who can use them, and whether they are on by default.
 *
 * Owner choices live in the business's appearance settings under `addons`
 * ({ events: true, blog: false, ... }). Nothing is stored for an add-on the
 * owner never touched, so existing businesses keep exactly the menu they have
 * today. To add a future engine, add one entry to ADDONS (and, if it has a
 * dashboard menu item, its navLabel).
 */
import type { FeatureId } from "./features";

export type AddonId = "events" | "blog" | "comments" | "forms" | "email" | "team";
export type AddonAccess = "free" | "premium_plus";

export type AddonDef = {
  id: AddonId;
  name: string;
  description: string;
  access: AddonAccess;
  /** Label of the dashboard menu item this add-on controls. */
  navLabel?: string;
  comingSoon?: boolean;
  /** The plan feature that unlocks this add-on. Plans that include it get the add-on; null means everyone. */
  feature: FeatureId | null;
  /** Free for every plan until the Oni247 admin says otherwise. */
  defaultFree?: boolean;
};

export const ADDONS: AddonDef[] = [
  { id: "events", name: "Events", description: "Publish events, take registrations, approve registrants and message them.", access: "premium_plus", navLabel: "Events", feature: "events" },
  { id: "blog", name: "Blog", description: "Write articles with images and video, with optional comments and reactions.", access: "premium_plus", navLabel: "Blog", feature: "blog" },
  { id: "comments", name: "Comments & reactions", description: "Let visitors comment and react on blog posts, events, galleries and products, with moderation.", access: "free", navLabel: "Comments", feature: "comments", defaultFree: true },
  { id: "forms", name: "Forms", description: "Build forms for bookings, sign-ups and requests, and review the submissions.", access: "premium_plus", navLabel: "Forms", feature: "forms" },
  { id: "email", name: "Email engine", description: "Send emails to your customers and event registrants from your dashboard, through your own email provider account.", access: "premium_plus", navLabel: "Email", feature: "email" },
  { id: "team", name: "Team and permissions", description: "Invite staff, give each person a role, and choose exactly what every role can see and change.", access: "premium_plus", navLabel: "Team", feature: "team" },
];

export const addonByNavLabel = (label: string): AddonId | null => ADDONS.find((a) => a.navLabel === label)?.id ?? null;

// What each site type showed in the menu before add-ons existed. Keeping this
// as the default means nobody's dashboard changes until they switch something.
const OFF_BY_DEFAULT: Record<string, AddonId[]> = {
  online_store: ["blog", "events", "forms", "comments"],
  service_business: ["events", "forms"],
  portfolio: ["events", "forms"],
  events_community: [],
};

export const addonDefault = (siteType: unknown, id: AddonId): boolean => {
  if (id === "email" || id === "team") return false;
  return !(OFF_BY_DEFAULT[String(siteType)] ?? []).includes(id);
};

export const isAddonEnabled = (appearance: Record<string, unknown> | null | undefined, id: AddonId): boolean => {
  const saved = appearance?.addons;
  if (saved && typeof saved === "object" && !Array.isArray(saved)) {
    const value = (saved as Record<string, unknown>)[id];
    if (typeof value === "boolean") return value;
  }
  return addonDefault(appearance?.siteType, id);
};
