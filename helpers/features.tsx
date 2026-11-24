/** Everything a plan can switch on. Shared by the server (what a shop may use) and the admin Plans screen (what each plan includes). */
export const FEATURES = [
  { id: "reports", label: "Sales and traffic reports", group: "Selling" },
  { id: "collections", label: "Product collections", group: "Selling" },
  { id: "product_links", label: "Shareable product links", group: "Selling" },
  { id: "tracking_links", label: "Order tracking links", group: "Selling" },
  { id: "presence_edit", label: "Business presence editing", group: "Website" },
  { id: "multi_page", label: "Multi-page website", group: "Website" },
  { id: "galleries", label: "Galleries", group: "Website" },
  { id: "blog", label: "Blog", group: "Website" },
  { id: "events", label: "Events and registrations", group: "Website" },
  { id: "forms", label: "Forms", group: "Website" },
  { id: "comments", label: "Comments and reactions", group: "Website" },
  { id: "advanced_media", label: "Video and advanced media", group: "Website" },
  { id: "services", label: "Services and bookings", group: "Services" },
  { id: "email", label: "Email engine", group: "Tools" },
  { id: "team", label: "Team and permissions", group: "Tools" },
] as const;

export type FeatureId = (typeof FEATURES)[number]["id"];
export const FEATURE_IDS: FeatureId[] = FEATURES.map((f) => f.id);
export const isFeatureId = (v: unknown): v is FeatureId => typeof v === "string" && (FEATURE_IDS as string[]).includes(v);

