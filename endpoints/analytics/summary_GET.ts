import superjson from "superjson";
import { db } from "../../helpers/db";
import { requireOwnedBusiness } from "../../helpers/requireOwnedBusiness";
import type { Count, OutputType, PeriodTotals } from "./summary_GET.schema";

const top = (map: Map<string, number>, limit: number): Count[] =>
  Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

const sourceLabel = (host: string | null): string => {
  if (!host) return "Direct";
  const h = host.toLowerCase();
  if (/facebook|fb\.com|fb\.me/.test(h)) return "Facebook";
  if (/instagram/.test(h)) return "Instagram";
  if (/whatsapp|wa\.me/.test(h)) return "WhatsApp";
  if (/google/.test(h)) return "Google";
  if (/(^|\.)t\.co$|twitter|(^|\.)x\.com$/.test(h)) return "X (Twitter)";
  if (/tiktok/.test(h)) return "TikTok";
  if (/youtube|youtu\.be/.test(h)) return "YouTube";
  if (/bing|duckduckgo|yahoo/.test(h)) return "Search engines";
  return host;
};

// Nigeria is UTC+1, so days and hours roll over at local time.
const LOCAL = 3_600_000;
const DAY = 86_400_000;

/** Visits and actions for the owner's own shop, counted by Oni247 itself. */
export async function handle(request: Request) {
  try {
    const { business } = await requireOwnedBusiness(request);
    const requested = Number(new URL(request.url).searchParams.get("days") ?? "30");
    const days = ([1, 7, 30, 90] as const).includes(requested as 1 | 7 | 30 | 90) ? (requested as 1 | 7 | 30 | 90) : 30;
    const now = Date.now();
    const from = new Date(now - days * DAY);
    const prevFrom = new Date(now - 2 * days * DAY);

    const [events, previousEvents, orders, previousOrders] = await Promise.all([
      db
        .selectFrom("storeEvents")
        .select(["event", "path", "referrer", "device", "visitorKey", "createdAt"])
        .where("businessId", "=", business.id)
        .where("createdAt", ">=", from)
        .orderBy("createdAt", "desc")
        .limit(50_000)
        .execute(),
      db
        .selectFrom("storeEvents")
        .select(["event", "visitorKey"])
        .where("businessId", "=", business.id)
        .where("createdAt", ">=", prevFrom)
        .where("createdAt", "<", from)
        .limit(50_000)
        .execute(),
      db
        .selectFrom("orders")
        .select(["totalAmount", "status"])
        .where("businessId", "=", business.id)
        .where("createdAt", ">=", from)
        .execute(),
      db
        .selectFrom("orders")
        .select(["totalAmount", "status"])
        .where("businessId", "=", business.id)
        .where("createdAt", ">=", prevFrom)
        .where("createdAt", "<", from)
        .execute(),
    ]);

    const counts = new Map<string, number>();
    const pages = new Map<string, number>();
    const sources = new Map<string, number>();
    const devices = new Map<string, number>();
    const products = new Map<string, number>();
    const visitors = new Set<string>();
    const productViewers = new Set<string>();
    const actors = new Set<string>();
    const dayViews = new Map<string, number>();
    const dayVisitors = new Map<string, Set<string>>();
    const hours: number[] = new Array(24).fill(0);

    for (const row of events) {
      bump(counts, row.event);
      if (row.visitorKey) {
        if (row.event === "product_view") productViewers.add(row.visitorKey);
        if (["whatsapp_click", "phone_click", "enquiry_submit", "order_submit"].includes(row.event)) actors.add(row.visitorKey);
      }
      if (row.event !== "page_view") continue;
      if (row.visitorKey) visitors.add(row.visitorKey);
      const path = row.path || "/";
      bump(pages, path);
      const productMatch = path.match(/^\/[^/]+\/p\/([^/?#]+)/);
      if (productMatch) bump(products, decodeURIComponent(productMatch[1]).replace(/-/g, " "));
      bump(sources, sourceLabel(row.referrer));
      bump(devices, row.device === "mobile" ? "Phone" : row.device === "tablet" ? "Tablet" : "Computer");
      const local = new Date(row.createdAt.getTime() + LOCAL);
      const day = local.toISOString().slice(0, 10);
      hours[local.getUTCHours()] += 1;
      bump(dayViews, day);
      if (row.visitorKey) {
        if (!dayVisitors.has(day)) dayVisitors.set(day, new Set());
        dayVisitors.get(day)?.add(row.visitorKey);
      }
    }

    const previousVisitors = new Set<string>();
    let previousViews = 0;
    for (const row of previousEvents) {
      if (row.event !== "page_view") continue;
      previousViews += 1;
      if (row.visitorKey) previousVisitors.add(row.visitorKey);
    }

    const daily: OutputType["daily"] = [];
    const span = Math.min(days, 30);
    for (let offset = span - 1; offset >= 0; offset -= 1) {
      const date = new Date(now + LOCAL - offset * DAY).toISOString().slice(0, 10);
      daily.push({ date, views: dayViews.get(date) ?? 0, visitors: dayVisitors.get(date)?.size ?? 0 });
    }

    const totalsOf = (list: Array<{ totalAmount: string; status: string }>) => {
      const counted = list.filter((order) => order.status !== "cancelled");
      return { count: counted.length, revenue: counted.reduce((sum, order) => sum + Number.parseFloat(order.totalAmount), 0) };
    };
    const current = totalsOf(orders);
    const before = totalsOf(previousOrders);
    const pageViews = counts.get("page_view") ?? 0;

    const previous: PeriodTotals = {
      visitors: previousVisitors.size,
      pageViews: previousViews,
      orders: before.count,
      revenue: before.revenue,
      conversionRate: previousVisitors.size > 0 ? (before.count / previousVisitors.size) * 100 : null,
    };

    let returning = 0;
    for (const key of visitors) if (previousVisitors.has(key)) returning += 1;

    const output: OutputType = {
      days,
      pageViews,
      visitors: visitors.size,
      actions: {
        whatsappClicks: counts.get("whatsapp_click") ?? 0,
        phoneClicks: counts.get("phone_click") ?? 0,
        productViews: counts.get("product_view") ?? 0,
        enquiries: counts.get("enquiry_submit") ?? 0,
        orders: counts.get("order_submit") ?? 0,
        registerClicks: counts.get("register_click") ?? 0,
      },
      orders: current.count,
      revenue: current.revenue,
      currency: business.currency,
      conversionRate: visitors.size > 0 ? (current.count / visitors.size) * 100 : null,
      daily,
      topPages: top(pages, 8),
      sources: top(sources, 6),
      devices: top(devices, 3),
      previous,
      newVisitors: visitors.size - returning,
      returningVisitors: returning,
      pagesPerVisitor: visitors.size > 0 ? pageViews / visitors.size : null,
      hours,
      topProducts: top(products, 6),
      funnel: [
        { label: "Visitors", count: visitors.size },
        { label: "Looked at a product", count: productViewers.size },
        { label: "Contacted or ordered", count: actors.size },
      ],
    };
    return new Response(superjson.stringify(output), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    const noBusiness = error instanceof Error && error.message === "NO_BUSINESS";
    return new Response(
      superjson.stringify({ error: noBusiness ? "Create your business page first." : "Not authenticated" }),
      { status: noBusiness ? 400 : 401 },
    );
  }
}
