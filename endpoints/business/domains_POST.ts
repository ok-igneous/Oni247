import { randomBytes } from "node:crypto";
import { isIP } from "node:net";
import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { hasPaidCustomDomainAccess } from "../../helpers/domainEntitlement";

const MULTI_LABEL_PUBLIC_SUFFIXES = new Set([
  "com.ng", "org.ng", "net.ng", "gov.ng", "edu.ng",
  "co.uk", "org.uk", "ac.uk", "gov.uk",
  "com.au", "net.au", "org.au", "edu.au",
  "co.nz", "org.nz", "co.za", "org.za",
  "com.br", "com.mx", "co.in", "firm.in", "net.in", "org.in",
  "com.sg", "com.my", "com.ph", "com.hk", "com.tw", "com.cn",
]);

const isApexOrWwwHostname = (hostname: string): boolean => {
  const domain = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  const labels = domain.split(".");
  const suffix = labels.slice(-2).join(".");
  const expectedLabels = MULTI_LABEL_PUBLIC_SUFFIXES.has(suffix) ? 3 : 2;
  return labels.length === expectedLabels;
};

const normalizeHostname = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const input = value.trim().toLowerCase();
  if (!input || input.length > 253 || input.includes("://") || input.includes("/") || input.includes("@")) return null;
  const hostname = input.replace(/\.$/, "");
  if (hostname.length > 253 || !hostname.includes(".")) return null;
  const labels = hostname.split(".");
  if (labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
  return hostname;
};

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    if (!(await hasPaidCustomDomainAccess(user.id))) {
      return new Response(superjson.stringify({ error: "Custom domains are available on active paid plans only. Your Oni247 /slug address remains available." }), { status: 403 });
    }
    const body = await request.json() as { hostname?: unknown };
    const hostname = normalizeHostname(body.hostname);
    if (!hostname || isIP(hostname) || !isApexOrWwwHostname(hostname)) {
      return new Response(superjson.stringify({
        error: "Enter a root domain (example.com or example.com.ng) or its www hostname. Other nested subdomains are not supported yet.",
      }), { status: 400 });
    }

    const platformRoot = (process.env.PLATFORM_ROOT_DOMAIN || process.env.APP_BASE_URL || "oni247.org")
      .replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
    if (hostname === platformRoot || hostname.endsWith("." + platformRoot) ||
        hostname === "onrender.com" || hostname.endsWith(".onrender.com")) {
      return new Response(superjson.stringify({ error: "This hostname is reserved for Oni247." }), { status: 400 });
    }

    const renderTarget = process.env.RENDER_CUSTOM_DOMAIN_TARGET?.trim();
    if (!process.env.RENDER_API_KEY?.trim() || !process.env.RENDER_SERVICE_ID?.trim() || !renderTarget) {
      return new Response(superjson.stringify({
        error: "Custom-domain connection is not configured yet. Please contact Oni247 support.",
      }), { status: 503 });
    }

    const business = await db.selectFrom("businesses").select(["id"])
      .where("ownerId", "=", user.id).limit(1).executeTakeFirst();
    if (!business) return new Response(superjson.stringify({ error: "Create your business profile first." }), { status: 404 });

    const token = randomBytes(24).toString("hex");
    const inserted = await sql<{ id: string }>`insert into business_domains
      (business_id, hostname, domain_type, status, verification_token, ssl_status)
      values (${business.id}, ${hostname}, 'customer_domain', 'pending', ${token}, 'pending')
      on conflict (hostname) do nothing
      returning id`.execute(db);
    if (!inserted.rows[0]) return new Response(superjson.stringify({ error: "This domain is already registered on Oni247." }), { status: 409 });

    const routing = [
      { type: "A", name: "@", value: "216.24.57.1" },
      { type: "CNAME", name: "www", value: renderTarget },
    ];
    return new Response(superjson.stringify({
      domain: { id: inserted.rows[0].id, hostname, status: "pending", sslStatus: "pending" },
      dns: {
        verification: { type: "TXT", name: `_oni247-verification.${hostname}`, value: `oni247-verification=${token}` },
        routing,
      },
      notice: "Add both routing records so Render can serve the apex and www hostname and redirect the secondary hostname to the one you registered. First add the TXT ownership record. Remove conflicting AAAA records. After DNS propagates, verify the domain here; Oni247 will register it with Render and monitor Render verification plus the HTTPS certificate. Render may charge for custom domains beyond your workspace allowance.",
    }), { status: 201, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add this domain.";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}
