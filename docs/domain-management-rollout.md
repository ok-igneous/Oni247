# Oni247 domain management rollout

## Application behavior in this branch

- Adds a multi-domain registry with globally unique hostnames, ownership verification state, Render resource IDs, TLS state, and one primary-domain constraint per business.
- Backfills existing verified legacy `businesses.custom_domain` values without deleting or rewriting the legacy columns.
- Adds authenticated endpoints to list, register, verify/synchronize, set the primary domain, and remove a customer-owned domain.
- The dashboard provides DNS instructions, TXT verification, Render/TLS status refresh, primary-domain selection, and removal.
- Customer-owned domain registration currently supports apex/root domains and their `www` hostname. Other nested customer subdomains are intentionally rejected until their DNS record UX is added.
- Newly registered customer domains route to a published business only when the Render domain is verified and an actual TLS handshake validates the certificate for that hostname.
- Existing legacy verified custom domains continue to resolve during migration.

## Render configuration required

Oni247 uses Render as the ingress and managed TLS provider. The API key is server-side only and must never be exposed to the browser.

Set these environment variables on the Oni247 Render web service:

- `PLATFORM_ROOT_DOMAIN=oni247.org`
- `RENDER_API_KEY`: a Render API key with permission to manage custom domains in the workspace containing Oni247.
- `RENDER_SERVICE_ID=srv-dc3ej8c0916s738jhr7g`: the currently connected Oni247 web service.
- `RENDER_CUSTOM_DOMAIN_TARGET=oni247-staging.onrender.com`: the exact service hostname used for customer `www` CNAME instructions.

Do not commit real credentials. The example file contains blank values.

## DNS instructions shown to customers

- Apex/root hostname (e.g. `example.com`): add an A record for `@` pointing to Render's load balancer IP `216.24.57.1`. If the DNS provider supports ANAME/ALIAS or CNAME flattening, it can point the root to the service's `onrender.com` hostname instead.
- `www` hostname (e.g. `www.example.com`): add a CNAME for `www` pointing to `RENDER_CUSTOM_DOMAIN_TARGET`.
- Add the TXT ownership challenge exactly as shown in the Oni247 dashboard.
- Remove conflicting AAAA records while configuring the domain.
- If the customer has restrictive CAA records, they must allow Let's Encrypt (`letsencrypt.org`) and Google Trust Services (`pki.goog`).

Oni247 first verifies its own TXT ownership challenge. It then registers the hostname with Render through the Render API. Render verifies routing DNS and provisions the TLS certificate. Oni247 checks Render's verification status and performs a public-IP TLS handshake with hostname verification before setting the domain active.

Render may bill for custom domains beyond the workspace's included allowance. Confirm the current workspace plan and domain count before enabling customer self-service at scale.

## Platform business subdomains

For `*.oni247.org`, add the wildcard hostname once to the Oni247 Render service and configure these DNS records at WhoGoHost:
- `* CNAME oni247-staging.onrender.com`
- `_acme-challenge CNAME oni247-staging.verify.renderdns.com`
- `_cf-custom-hostname CNAME oni247-staging.hostname.renderdns.com`

Render's wildcard setup requires all three records. The platform root domain must also point to Render for Render wildcard routing to work. The `_cf-custom-hostname` record is Render's own verification mechanism; it does not mean Oni247 is using a Cloudflare account or Cloudflare DNS. The current apex DNS and email records must be preserved; do not change authoritative nameservers as part of this setup.

Oni247 resolves individual business subdomains from business slugs in the application database. Do not create one Render custom-domain entry per Oni247 business subdomain.

## Safe rollout

1. Set the four server environment variables above; keep the Render API key private.
2. Apply migrations `003_business_domains.sql` and `004_render_domain_provisioning.sql` to the Oni247 Neon database using the existing migration runner.
3. Add and verify the Render wildcard hostname and DNS records once for `*.oni247.org`.
4. Test a published business subdomain.
5. Test a customer-owned domain on a non-production hostname: TXT challenge, Render registration, routing DNS, Render verification, TLS handshake, active routing, primary selection and removal.
6. Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run audit:standalone` before merging.

No production DNS, Render settings, Neon data, or deployment is changed by this branch.
