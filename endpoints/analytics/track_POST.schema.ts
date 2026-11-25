import superjson from "superjson";
import { z } from "zod";

export const EVENT_NAMES = [
  "page_view",
  "product_view",
  "gallery_view",
  "whatsapp_click",
  "phone_click",
  "enquiry_submit",
  "order_submit",
  "register_click",
] as const;

export const schema = z.object({
  slug: z.string().min(1).max(120),
  event: z.enum(EVENT_NAMES),
  path: z.string().max(300).optional(),
  referrer: z.string().max(300).optional(),
  visitorKey: z.string().max(64).optional(),
});

export type InputType = z.infer<typeof schema>;

/** Fire-and-forget: a visit must never slow down or break a shop page. */
export const postTrack = (body: InputType): void => {
  try {
    const payload = superjson.stringify(schema.parse(body));
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/_api/analytics/track", new Blob([payload], { type: "text/plain" }));
      return;
    }
    void fetch("/_api/analytics/track", { method: "POST", body: payload, keepalive: true }).catch(() => {});
  } catch {
    /* analytics must never block a shop page */
  }
};

