# Oniduka Mini

A business page and product/service catalogue for small businesses in Nigeria,
with orders taken through WhatsApp. Part of the Oniduka product line but
deliberately standalone: its own auth, database, tenancy and storage, with no
connection to OniVend Core, OniRep, VendMage or OniKeep. Portability off this
platform is a hard requirement, not a nice-to-have.

Two audiences. **Business owners** sign in, create one business, manage
   10	categories and products, and read orders and enquiries. **Customers** need no
   11	account: they open `/store/{slug}`, browse, add to a cart held in their own
   12	browser, and send the order to the shop's WhatsApp.
   13	
   14	## Rules that matter
   15	
   16	- **Tenant isolation.** Owner endpoints start with `requireOwnedBusiness`, which
   17	  derives the business from the session. Never accept a business id from a
   18	  request body. Scope every query with `business_id`. Verify foreign ids (e.g.
   19	  `categoryId`) are owned before using them.
   20	- **Never trust client prices.** The order endpoint re-reads prices from the
   21	  database and computes the total itself.
   22	- **Public endpoints** serve `status = 'published'` businesses only.
   23	- **Images** go to object storage via presigned PUT — never through an endpoint,
   24	  never into PostgreSQL. PNG/JPG/WebP, 3 MB cap, enforced server-side too.
   25	- **Keep it light.** No polling, no realtime, no new dependencies without a
   26	  reason. Public pages must load fast on a phone on mobile data.
   27	- **Don't build the full Oniduka platform.** Custom domains, blog, payments,
   28	  memberships and OniVend integration are extension points only — no empty
   29	  screens.
   30	
   31	Architecture, migration and export procedure: `static/__dev/docs/README.md`.
