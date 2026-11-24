import { postTrack } from "../endpoints/analytics/track_POST.schema";
import { getVisitorKey } from "./visitorKey";

type StoreEvent =
  | "store_view"
  | "product_view"
  | "gallery_view"
  | "whatsapp_click"
  | "phone_click"
  | "enquiry_submit"
  | "order_submit"
  | "register_click";

declare global {
  interface Window {
    flootAnalytics?: { trackEvent?: (name: string, payload?: Record<string, unknown>) => void };
  }
}

/** Paths that belong to the app itself, not to a shop's public site. */
const APP_SEGMENTS = new Set([
  "dashboard", "admin", "login", "register", "forgot-password", "reset-password", "verify-email", "s", "track", "store", "_api", "_cdn",
]);

/** The shop a public page belongs to, taken from the first part of its address. */
export const shopSlugFromPath = (pathname: string): string | null => {
  const first = pathname.split("/").filter(Boolean)[0];
  return first && !APP_SEGMENTS.has(first) ? first : null;
};

/** Counts a visit or action for the shop's own Traffic page. Never throws and never waits. */
export const trackStoreEvent = (event: StoreEvent, payload: Record<string, string | number | boolean | null> = {}) => {
  try {
    const analytics = window.flootAnalytics;
    if (analytics?.trackEvent) analytics.trackEvent(`oniduka_${event}`, payload);
  } catch {
    // Analytics must never block a storefront action.
  }
  try {
    // A page view is counted by the route tracker, so the older store_view call is not counted twice.
    if (event === "store_view") return;
    const slug = shopSlugFromPath(window.location.pathname);
    if (!slug) return;
    postTrack({ slug, event, path: window.location.pathname, visitorKey: getVisitorKey() });
  } catch {
    // Same rule: counting must stay invisible.
  }
};

/** Called when a public page opens. */
export const trackPageView = (pathname: string) => {
  try {
    const slug = shopSlugFromPath(pathname);
    if (!slug) return;
    postTrack({ slug, event: "page_view", path: pathname, referrer: document.referrer || undefined, visitorKey: getVisitorKey() });
  } catch {
    // Never block navigation.
  }
};

