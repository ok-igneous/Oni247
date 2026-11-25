# Oni247 developer notes

A business page and product/service catalogue for small businesses, with orders
taken through WhatsApp. Independent of OniVend Core, OniRep, VendMage and
OniKeep — it has its own authentication, database, tenancy and storage.

---

## 1. Database schema

PostgreSQL. All identifiers are snake_case. Application tables:

| Table | Purpose | Tenant key |
|---|---|---|
| `businesses` | One row per shop. `slug` is unique and drives `/store/{slug}`. | `owner_id` → `users.id` |
| `categories` | Catalogue groups. | `business_id` |
| `products` | Products and services. `slug` unique **per business**. | `business_id` |
| `enquiries` | Contact-form messages. | `business_id` |
| `orders` | Orders sent to WhatsApp. `items` is `jsonb`. | `business_id` |

Auth tables provided by the platform: `users`, `user_passwords`, `sessions`,
`login_attempts`.

Enum types: `business_status` (draft, published, suspended), `store_theme`
(clean, commerce, service), `enquiry_status` (new, contacted, resolved),
`order_status` (pending, contacted, completed, cancelled).

Money is `numeric(12,2)`. It arrives in JavaScript as a **string**; parse it at
the boundary (`Number.parseFloat`) and never do arithmetic on the raw value.

Every child table cascades on delete from `businesses`, except
`products.category_id`, which is `ON DELETE SET NULL` so deleting a category
never deletes stock.

### Export

```
pg_dump --no-owner --no-privileges "$SOURCE_DATABASE_URL" > oniduka-mini.sql
psql "$NEW_DATABASE_URL" < oniduka-mini.sql
```

The schema uses no provider-specific extensions. `gen_random_uuid()` is built into
PostgreSQL 13+. Any PostgreSQL-compatible host (Neon, Supabase, RDS, a plain
server) will take this dump unchanged.

---

## 2. Environment variables

| Variable | Used for | Notes |
|---|---|---|
| `SOURCE_DATABASE_URL` | PostgreSQL connection string | Use `DATABASE_URL` for the standalone app; source credentials are used only for controlled export. |
| `JWT_SECRET` | Signs session tokens | Rotating it logs everyone out. |

No other secrets exist. Nothing is hard-coded, and no credential is referenced
from frontend code — `process.env` is available on the backend only.

---

## 3. Authentication

Email and password, with server-side sessions.

- Passwords hashed with bcrypt (`helpers/generatePasswordHash`).
- Session id stored in an HTTP-only cookie; row in `sessions`; expiry refreshed
  on access.
- `helpers/getServerUserSession` resolves a request to a user.
- `helpers/requireOwnedBusiness` resolves a request to that user's business.

**Standalone auth boundary.** Authentication is handled by the Node.js API using signed sessions and the `oni247_session` HTTP-only cookie. Keep token verification, session resolution and authorization on the server; never trust client-supplied user or business identifiers.

---

## 4. Tenant isolation

Read this before changing any endpoint.

1. **The client never supplies a business id.** `requireOwnedBusiness(request)`
   derives it from the session. There is no field in any request body an
   attacker could swap.
2. **Every owner-side query is scoped** with `.where("businessId", "=", business.id)`.
   On updates and deletes this is what enforces isolation: an id belonging to
   another shop matches no row, and the endpoint returns 404 rather than
   confirming the record exists.
3. **Foreign ids are verified as owned** before use — saving a product with a
   `categoryId` checks that category belongs to the caller's business.
4. **Public endpoints only ever read `status = 'published'` rows.**
5. **Uploads are namespaced** under `businesses/{businessId}/` from the session
   id, so one shop cannot write into another's folder.

### Recommended hardening after migration

On a database where you control roles, add row-level security as a second
layer:

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON products
  USING (business_id = current_setting('app.current_business_id')::uuid);
```

This requires the application to connect as a **non-owner role** and to issue
`SET LOCAL app.current_business_id` inside a transaction on every request. It is
not enabled here: the current host connects through one pooled owner role, where
those policies would not apply and a partial implementation would fail open.
Every tenant table already carries `business_id`, so no schema change is needed
when you turn this on.

---

## 5. File storage

Product photos and logos live in object storage, never in PostgreSQL. The
database holds only the URL.

Flow: the browser asks `POST /_api/uploads/presign` → the server authenticates,
validates type and size, and returns a short-lived signed URL → the browser
`PUT`s the bytes directly. **File bytes never pass through an application
endpoint.**

Constraints, enforced on both client and server:

- `image/png`, `image/jpeg`, `image/webp` only. SVG, HTML and XML are rejected —
  they can carry scripts, and these images are served on pages customers open.
- 3 MB maximum.

The standalone upload flow uses the S3-compatible presigned PUT adapter in `helpers/objectStorage.tsx`. Existing records may still contain old CDN paths; migrate those values only after copying and verifying the corresponding objects in the destination bucket:

```sql
UPDATE products SET image_url = replace(image_url, '/_cdn/', 'https://cdn.example.com/');
UPDATE businesses SET logo_url = replace(logo_url, '/_cdn/', 'https://cdn.example.com/');
```

---

## 6. Deployment requirements

- Node.js, React 19, PostgreSQL 13+, an S3-compatible bucket.
- Any host that can run a Node server and serve static assets.
- No background workers, no cron, no realtime connections, no polling.

### The one real constraint

`business.oniduka.com`-style subdomains **cannot** work on the current host — it
serves one domain per application and does not support multi-tenant subdomains.
Path-based `/store/{slug}` works indefinitely. The database is already shaped
for subdomains (`slug` is unique globally), so when you move to your own hosting
you add a wildcard DNS record and resolve the subdomain to `slug` — no schema
change, no data migration.

---

## 7. Code layout

Repository convention: keep route files in `pages/`, reusable UI in `components/`, shared server/client utilities in `helpers/`, and API handlers in `endpoints/`. Preserve clear boundaries between presentation, domain logic and persistence:

| Brief | Here |
|---|---|
| `lib/db` | `helpers/db`, `helpers/schema` |
| `lib/auth` | `helpers/getServerUserSession`, `helpers/requireOwnedBusiness` |
| `lib/storage` | `endpoints/uploads/presign_POST`, `helpers/uploadImage` |
| `lib/whatsapp` | `helpers/buildWhatsAppOrderUrl` |
| `features/*` | `endpoints/{business,categories,products,orders,enquiries}/*` |

**No database query appears inside a React component.** Pages call React Query
hooks (`helpers/use*`), hooks call typed endpoint clients, endpoints hold the
queries. When you restructure into folders after migration, this mapping is the
move list.

### Reusable utilities

`helpers/buildWhatsAppOrderUrl`, `helpers/formatMoney`, `helpers/toSlug` and
`helpers/useStoreCart` import nothing platform-specific and move untouched.

---

## 8. Demo data

The seeded demo shop is marked `is_demo = true` on `businesses`. Before going
live:

```sql
DELETE FROM businesses WHERE is_demo = true;
```

Children cascade. No production path reads or writes `is_demo`, so demo rows can
never mix into real data.

---

## 9. Extension points (deliberately not built)

Structured for, but not implemented: custom domains, AI site builder, blog,
forms, courses, memberships, downloads, careers, offers, branches, payments,
advanced analytics, OniVend inventory integration. There are no empty screens
for any of these. `businesses.theme_id` is an enum, `orders.items` is `jsonb`,
and every tenant table carries `business_id` — the seams are there when needed.
