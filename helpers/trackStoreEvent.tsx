type StoreEvent = "store_view" | "product_view" | "gallery_view" | "whatsapp_click" | "phone_click" | "enquiry_submit" | "order_submit";
declare global {
  interface Window {
    flootAnalytics?: { trackEvent?: (name: string, payload?: Record<string, unknown>) => void };
  }
}

export const trackStoreEvent = (event: StoreEvent, payload: Record<string, string | number | boolean | null> = {}) => {
  try {
   10	    const analytics = window.flootAnalytics;
   11	    if (analytics?.trackEvent) analytics.trackEvent(`oniduka_${event}`, payload);
   12	  } catch {
   13	    // Analytics must never block a storefront action.
   14	  }
   15	};
