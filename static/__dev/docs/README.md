# Oniduka Mini

A business page and product/service catalogue for small businesses, with orders
taken through WhatsApp. Independent of OniVend Core, OniRep, VendMage and
OniKeep — it has its own authentication, database, tenancy and storage.

---

## 1. Database schema
   10	
   11	PostgreSQL. All identifiers are snake_case. Application tables:
   12	
   13	| Table | Purpose | Tenant key |
   14	|---|---|---|
   15	| `businesses` | One row per shop. `slug` is unique and drives `/store/{slug}`. | `owner_id` → `users.id` |
   16	| `categories` | Catalogue groups. | `business_id` |
   17	| `products` | Products and services. `slug` unique **per business**. | `business_id` |
   18	| `enquiries` | Contact-form messages. | `business_id` |
   19	| `orders` | Orders sent to WhatsApp. `items` is `jsonb`. | `business_id` |
   20	
   21	Auth tables provided by the platform: `users`, `user_passwords`, `sessions`,
   22	`login_attempts`.
   23	
   24	Enum types: `business_status` (draft, published, suspended), `store_theme`
   25	(clean, commerce, service), `enquiry_status` (new, contacted, resolved),
   26	`order_status` (pending, contacted, completed, cancelled).
   27	
   28	Money is `numeric(12,2)`. It arrives in JavaScript as a **string**; parse it at
   29	the boundary (`Number.parseFloat`) and never do arithmetic on the raw value.
   30	
   31	Every child table cascades on delete from `businesses`, except
   32	`products.category_id`, which is `ON DELETE SET NULL` so deleting a category
   33	never deletes stock.
   34	
   35	### Export
   36	
   37	```
   38	pg_dump --no-owner --no-privileges "$FLOOT_DATABASE_URL" > oniduka-mini.sql
   39	psql "$NEW_DATABASE_URL" < oniduka-mini.sql
   40	```
   41	
   42	The schema uses no Floot-specific extensions. `gen_random_uuid()` is built into
   43	PostgreSQL 13+. Any PostgreSQL-compatible host (Neon, Supabase, RDS, a plain
   44	server) will take this dump unchanged.
   45	
   46	---
   47	
   48	## 2. Environment variables
   49	
   50	| Variable | Used for | Notes |
   51	|---|---|---|
   52	| `FLOOT_DATABASE_URL` | PostgreSQL connection string | Rename to `DATABASE_URL` on migration; it is referenced only in `helpers/db`. |
   53	| `JWT_SECRET` | Signs session tokens | Rotating it logs everyone out. |
   54	
   55	No other secrets exist. Nothing is hard-coded, and no credential is referenced
   56	from frontend code — `process.env` is available on the backend only.
   57	
   58	---
   59	
   60	## 3. Authentication
   61	
   62	Email and password, with server-side sessions.
   63	
   64	- Passwords hashed with bcrypt (`helpers/generatePasswordHash`).
   65	- Session id stored in an HTTP-only cookie; row in `sessions`; expiry refreshed
   66	  on access.
   67	- `helpers/getServerUserSession` resolves a request to a user.
   68	- `helpers/requireOwnedBusiness` resolves a request to that user's business.
   69	
   70	**Migration note.** This is the least portable layer. To move off the platform,
   71	replace the four seeded auth endpoints (`endpoints/auth/*`) and
   72	`helpers/getSetServerSession`. Everything above them depends only on
   73	`getServerUserSession` returning `{ user: { id, email, ... } }`, so the rest of
   74	the application does not change.
   75	
   76	---
   77	
   78	## 4. Tenant isolation
   79	
   80	Read this before changing any endpoint.
   81	
   82	1. **The client never supplies a business id.** `requireOwnedBusiness(request)`
   83	   derives it from the session. There is no field in any request body an
   84	   attacker could swap.
   85	2. **Every owner-side query is scoped** with `.where("businessId", "=", business.id)`.
   86	   On updates and deletes this is what enforces isolation: an id belonging to
   87	   another shop matches no row, and the endpoint returns 404 rather than
   88	   confirming the record exists.
   89	3. **Foreign ids are verified as owned** before use — saving a product with a
   90	   `categoryId` checks that category belongs to the caller's business.
   91	4. **Public endpoints only ever read `status = 'published'` rows.**
   92	5. **Uploads are namespaced** under `businesses/{businessId}/` from the session
   93	   id, so one shop cannot write into another's folder.
   94	
   95	### Recommended hardening after migration
   96	
   97	On a database where you control roles, add row-level security as a second
   98	layer:
   99	
  100	```sql
  101	ALTER TABLE products ENABLE ROW LEVEL SECURITY;
  102	ALTER TABLE products FORCE ROW LEVEL SECURITY;
  103	CREATE POLICY tenant_isolation ON products
  104	  USING (business_id = current_setting('app.current_business_id')::uuid);
  105	```
  106	
  107	This requires the application to connect as a **non-owner role** and to issue
  108	`SET LOCAL app.current_business_id` inside a transaction on every request. It is
  109	not enabled here: the current host connects through one pooled owner role, where
  110	those policies would not apply and a partial implementation would fail open.
  111	Every tenant table already carries `business_id`, so no schema change is needed
  112	when you turn this on.
  113	
  114	---
  115	
  116	## 5. File storage
  117	
  118	Product photos and logos live in object storage, never in PostgreSQL. The
  119	database holds only the URL.
  120	
  121	Flow: the browser asks `POST /_api/uploads/presign` → the server authenticates,
  122	validates type and size, and returns a short-lived signed URL → the browser
  123	`PUT`s the bytes directly. **File bytes never pass through an application
  124	endpoint.**
  125	
  126	Constraints, enforced on both client and server:
  127	
  128	- `image/png`, `image/jpeg`, `image/webp` only. SVG, HTML and XML are rejected —
  129	  they can carry scripts, and these images are served on pages customers open.
  130	- 3 MB maximum.
  131	
  132	To migrate: swap the `@floot/storage` calls in `endpoints/uploads/presign_POST.ts`
  133	for S3 (or compatible) presigned PUTs. That one file is the entire storage
  134	dependency. Existing `image_url` values are absolute paths — copy the bucket
  135	contents and rewrite the column prefix:
  136	
  137	```sql
  138	UPDATE products SET image_url = replace(image_url, '/_cdn/', 'https://cdn.example.com/');
  139	UPDATE businesses SET logo_url = replace(logo_url, '/_cdn/', 'https://cdn.example.com/');
  140	```
  141	
  142	---
  143	
  144	## 6. Deployment requirements
  145	
  146	- Node.js, React 19, PostgreSQL 13+, an S3-compatible bucket.
  147	- Any host that can run a Node server and serve static assets.
  148	- No background workers, no cron, no realtime connections, no polling.
  149	
  150	### The one real constraint
  151	
  152	`business.oniduka.com`-style subdomains **cannot** work on the current host — it
  153	serves one domain per application and does not support multi-tenant subdomains.
  154	Path-based `/store/{slug}` works indefinitely. The database is already shaped
  155	for subdomains (`slug` is unique globally), so when you move to your own hosting
  156	you add a wildcard DNS record and resolve the subdomain to `slug` — no schema
  157	change, no data migration.
  158	
  159	---
  160	
  161	## 7. Code layout
  162	
  163	The platform requires flat `pages/`, `components/`, `helpers/` and `endpoints/`
  164	folders — the `src/features/...` tree in the original brief is not possible
  165	here. The layering is preserved by convention instead:
  166	
  167	| Brief | Here |
  168	|---|---|
  169	| `lib/db` | `helpers/db`, `helpers/schema` |
  170	| `lib/auth` | `helpers/getServerUserSession`, `helpers/requireOwnedBusiness` |
  171	| `lib/storage` | `endpoints/uploads/presign_POST`, `helpers/uploadImage` |
  172	| `lib/whatsapp` | `helpers/buildWhatsAppOrderUrl` |
  173	| `features/*` | `endpoints/{business,categories,products,orders,enquiries}/*` |
  174	
  175	**No database query appears inside a React component.** Pages call React Query
  176	hooks (`helpers/use*`), hooks call typed endpoint clients, endpoints hold the
  177	queries. When you restructure into folders after migration, this mapping is the
  178	move list.
  179	
  180	### Portable by design
  181	
  182	`helpers/buildWhatsAppOrderUrl`, `helpers/formatMoney`, `helpers/toSlug` and
  183	`helpers/useStoreCart` import nothing platform-specific and move untouched.
  184	
  185	---
  186	
  187	## 8. Demo data
  188	
  189	The seeded demo shop is marked `is_demo = true` on `businesses`. Before going
  190	live:
  191	
  192	```sql
  193	DELETE FROM businesses WHERE is_demo = true;
  194	```
  195	
  196	Children cascade. No production path reads or writes `is_demo`, so demo rows can
  197	never mix into real data.
  198	
  199	---
  200	
  201	## 9. Extension points (deliberately not built)
  202	
  203	Structured for, but not implemented: custom domains, AI site builder, blog,
  204	forms, courses, memberships, downloads, careers, offers, branches, payments,
  205	advanced analytics, OniVend inventory integration. There are no empty screens
  206	for any of these. `businesses.theme_id` is an enum, `orders.items` is `jsonb`,
  207	and every tenant table carries `business_id` — the seams are there when needed.
