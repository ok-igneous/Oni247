import { randomBytes } from "node:crypto";
import superjson from "superjson";
import { sql } from "kysely";
import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";

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

const RESERVED = new Set(["www", "admin", "api", "mail", "ftp", "localhost"]);

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const body = await request.json() as { hostname?: unknown };
    const hostname = normalizeHostname(body.hostname);
    if (!hostname) return new Response(superjson.stringify({ error: "Enter a valid domain name without http:// or https://." }), { status: 400 });

    const platformRoot = (process.env.PLATFORM_ROOT_DOMAIN || process.env.APP_BASE_URL || "oni247.org")
      .replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
    if (hostname === platformRoot || hostname.endsWith("." + platformRoot) ||
        RESERVED.has(hostname.split(".")[0])) {
      return new Response(superjson.stringify({ error: "This hostname is reserved for Oni247." }), { status: 400 });
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

    const renderTarget = process.env.RENDER_CUSTOM_DOMAIN_TARGET?.trim() || null;
    const isWww = hostname.startsWith("www.");
    const routing = isWww
      ? (renderTarget ? { type: "CNAME", name: "www", value: renderTarget } : null)
      : { type: "A", name: "@", value: "216.24.57.1" };
    return new Response(superjson.stringify({
      domain: { id: inserted.rows[0].id, hostname, status: "pending", sslStatus: "pending" },
      dns: {
        verification: { type: "TXT", name: `_oni247-verification.${hostname}`, value: `oni247-verification=${token}` },
        routing,
      },
      notice: "First add the TXT ownership record. Then add the routing record. Remove conflicting AAAA records. After DNS propagates, verify the domain here; Oni247 will register it with Render and monitor Render verification plus the HTTPS certificate. Render may charge for custom domains beyond your workspace allowance.",
    }), { status: 201, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add this domain.";
    return new Response(superjson.stringify({ error: message }), { status: 400 });
  }
}
