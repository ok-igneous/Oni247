import superjson from "superjson";

export type Count = { name: string; count: number };

export type PeriodTotals = {
  visitors: number;
  pageViews: number;
  orders: number;
  revenue: number;
  conversionRate: number | null;
};

export type OutputType = {
  days: number;
  pageViews: number;
  visitors: number;
  actions: {
    whatsappClicks: number;
    phoneClicks: number;
    productViews: number;
    enquiries: number;
    orders: number;
    registerClicks: number;
  };
  orders: number;
  revenue: number;
  currency: string;
  /** Orders divided by visitors, as a percentage. null until there are visitors. */
  conversionRate: number | null;
  daily: Array<{ date: string; views: number; visitors: number }>;
  topPages: Count[];
  sources: Count[];
  devices: Count[];
  /** The same totals for the period just before this one, for comparison. */
  previous?: PeriodTotals;
  /** Visitors seen for the first time versus ones also seen in the period before. */
  newVisitors?: number;
  returningVisitors?: number;
  /** Average pages opened per visitor. */
  pagesPerVisitor?: number | null;
  /** Page views for each hour of the day (Nigeria time), 24 numbers. */
  hours?: number[];
  topProducts?: Count[];
  /** Visitors → looked at a product → contacted or ordered. */
  funnel?: Array<{ label: string; count: number }>;
};

export const getAnalytics = async (days: 1 | 7 | 30 | 90, init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/analytics/summary?days=${days}`, {
    method: "GET",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
