/**
 * Every role and permission in the app, in one place. Used by the server to enforce access and by the
 * Team screen to show it. A permission is "<module>.<action>", for example "orders.edit".
 */
export const ACTIONS = [
  { id: "view", label: "View" },
  { id: "create", label: "Create" },
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete" },
] as const;
export type ActionId = (typeof ACTIONS)[number]["id"];

export type ModuleDef = {
  id: string;
  label: string;
  group: "Selling" | "Customers" | "Website" | "Money" | "Tools";
  /** Dashboard menu paths this module controls, so members only see what they may use. */
  menu: string[];
  /** First part of the endpoint path (and, for business, the second) that belongs to this module. */
  api: string[];
};

export const MODULES: ModuleDef[] = [
  { id: "products", label: "Products and categories", group: "Selling", menu: ["products", "categories", "share"], api: ["products", "categories", "showcases"] },
  { id: "orders", label: "Orders", group: "Selling", menu: ["orders"], api: ["orders"] },
  { id: "bookings", label: "Service bookings", group: "Selling", menu: ["services"], api: ["bookings"] },
  { id: "customers", label: "Customers", group: "Customers", menu: ["customers"], api: ["customers"] },
  { id: "enquiries", label: "Enquiries", group: "Customers", menu: ["enquiries"], api: ["enquiries"] },
  { id: "comments", label: "Comments and reactions", group: "Customers", menu: ["comments"], api: ["engagement"] },
  { id: "presence", label: "Website content", group: "Website", menu: ["presence"], api: ["presence"] },
  { id: "blog", label: "Blog", group: "Website", menu: ["blog"], api: ["blog"] },
  { id: "galleries", label: "Galleries", group: "Website", menu: ["galleries"], api: ["galleries"] },
  { id: "events", label: "Events", group: "Website", menu: ["events"], api: ["events"] },
  { id: "forms", label: "Forms", group: "Website", menu: ["forms"], api: ["forms"] },
  { id: "media", label: "Media library", group: "Website", menu: ["media"], api: ["media", "uploads"] },
  { id: "settings", label: "Business profile and theme", group: "Website", menu: ["business", "theme"], api: ["business/save"] },
  { id: "payments", label: "Payments and payment links", group: "Money", menu: ["payments"], api: ["payments"] },
  { id: "checkout", label: "Delivery and checkout settings", group: "Money", menu: ["checkout"], api: ["business/checkoutSettings"] },
  { id: "reports", label: "Reports and traffic", group: "Tools", menu: ["reports", "traffic"], api: ["reports", "traffic", "analytics"] },
  { id: "email", label: "Email engine", group: "Tools", menu: ["email"], api: ["email"] },
];

/** Reserved for the shop owner. A role can never include these. */
export const OWNER_ONLY_API = ["subscription", "addons", "team"];
export const OWNER_ONLY_MENU = ["plan", "addons", "team"];
/** Any signed-in team member may call these. */
export const OPEN_API = ["business/me", "dashboard", "team/me", "auth"];

export const ALL_PERMISSIONS: string[] = MODULES.flatMap((m) => ACTIONS.map((a) => `${m.id}.${a.id}`));
export const isPermission = (v: unknown): v is string => typeof v === "string" && ALL_PERMISSIONS.includes(v);

const all = (ids: string[], actions: ActionId[] = ["view", "create", "edit", "delete"]) => ids.flatMap((m) => actions.map((a) => `${m}.${a}`));

export type SystemRole = { name: string; description: string; permissions: string[] };
export const SYSTEM_ROLES: SystemRole[] = [
  { name: "Manager", description: "Runs the shop day to day. Everything except plan, add-ons and team.", permissions: ALL_PERMISSIONS },
  {
    name: "Sales staff",
    description: "Handles orders, bookings, customers and enquiries. Can see products and payments.",
    permissions: [...all(["orders", "bookings", "customers", "enquiries"], ["view", "edit"]), ...all(["products", "payments"], ["view"])],
  },
  {
    name: "Content editor",
    description: "Looks after the website: pages, blog, galleries, events, forms and media.",
    permissions: [...all(["presence", "blog", "galleries", "events", "forms", "media", "comments"]), ...all(["products"], ["view"])],
  },
  {
    name: "Support",
    description: "Answers customers. Can see orders and customers, and reply to enquiries and comments.",
    permissions: [...all(["orders", "customers"], ["view"]), ...all(["enquiries", "comments", "bookings"], ["view", "edit"])],
  },
];

/** The two built-in roles that exist outside any shop's team. Shown for reference, never edited. */
export const BUILT_IN_ROLES = [
  { id: "platform_admin", name: "Platform admin", scope: "Oni247", description: "Runs Oni247 itself: businesses, plans, add-ons, mail, subscription payments and the landing page. Signs in at /admin.", can: ["Everything under Admin", "Set up plans, prices and add-ons", "Suspend or restore any business"] },
  { id: "shop_owner", name: "Shop owner", scope: "One business", description: "Created the business. Has every permission in it and is the only one who can change the plan, add-ons and team.", can: ["Every shop permission", "Plan, add-ons and billing", "Invite team and set roles"] },
  { id: "customer", name: "Customer", scope: "Public", description: "Shops, books and pays on the public site with no account.", can: ["Browse and order", "Pay online and track orders", "Send enquiries and comments"] },
] as const;

export type ApiTarget = { kind: "owner_only" } | { kind: "open" } | { kind: "module"; module: string } | { kind: "unknown" };

/** Works out which module an owner-side endpoint belongs to, from its path (for example /_api/orders/list). */
export const targetForPath = (pathname: string): ApiTarget => {
  const parts = pathname.replace(/^\/_api\//, "").split("/").filter(Boolean);
  const seg = parts[0] ?? "";
  const pair = `${seg}/${parts[1] ?? ""}`;
  if (OWNER_ONLY_API.includes(seg) && pair !== "team/me") return { kind: "owner_only" };
  if (OPEN_API.some((o) => o === pair || o === seg)) return { kind: "open" };
  const m = MODULES.find((x) => x.api.includes(pair) || x.api.includes(seg));
  return m ? { kind: "module", module: m.id } : { kind: "unknown" };
};

export const actionForRequest = (method: string, pathname: string): ActionId => {
  if (method === "GET") return "view";
  const name = (pathname.split("/").pop() ?? "").toLowerCase();
  if (name.includes("delete") || name.includes("remove")) return "delete";
  if (name.includes("create")) return "create";
  return "edit";
};

export const permits = (permissions: readonly string[], module: string, action: ActionId): boolean => {
  if (permissions.includes(`${module}.${action}`)) return true;
  // Saving a form is both creating and editing, so either permission lets it through.
  if (action === "edit") return permissions.includes(`${module}.create`);
  if (action === "create") return permissions.includes(`${module}.edit`);
  return false;
};

export const canSeeMenu = (menuPath: string, isOwner: boolean, permissions: readonly string[]): boolean => {
  if (isOwner) return true;
  if (OWNER_ONLY_MENU.includes(menuPath)) return false;
  const m = MODULES.find((x) => x.menu.includes(menuPath));
  if (!m) return true;
  return permissions.includes(`${m.id}.view`);
};

