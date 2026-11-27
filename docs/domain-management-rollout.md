# Oni247 customer custom-domain rollout

## Product behavior

- Every published business keeps its default Oni247 URL: `https://oni247.org/{business-slug}`.
- Customer-owned domains are optional. Connecting one does not remove or disable the Oni247 `/slug` URL.
- Only an active paid subscription may register, verify, select, or serve a customer-owned domain. Free accounts, trial-only accounts, and expired subscriptions use the Oni247 `/slug` URL.
- The paid-plan entitlement is checked server-side on domain registration, verification, and primary-domain selection; hiding dashboard controls is not the security boundary.
- When paid access expires, dashboard sharing and both human and crawler storefront host resolution stop using the customer domain. The Oni247 `/slug` URL remains available. Domain removal remains available for cleanup.
- A paid business owner can choose an active, HTTPS-ready customer domain as the preferred sharing domain, or switch back to the Oni247 `/slug` URL at any time.
- No wildcard DNS, business subdomains, or per-business Render configuration is required.
- The domain registry stores ownership verification, Render resource IDs, TLS state, and hostname-to-business mapping.
- Existing verified legacy custom domains are backfilled without deleting the legacy business columns.
- Customer-owned domain registration currently supports root/apex domains and their `www` hostname. Other nested subdomains are intentionally not supported yet.

## Render configuration

Oni247 uses Render as the ingress and managed TLS provider for customer-owned domains.

Set these environment variables on the Oni247 Render web service:

- `APP_BASE_URL=https://oni247.org`
- `RENDER_API_KEY`: a private Render API key with permission to manage custom domains in the workspace containing Oni247.
- `RENDER_SERVICE_ID=srv-dc3ej8c0916s738jhr7g`: the current Oni247 web service.
- `RENDER_CUSTOM_DOMAIN_TARGET=oni247-staging.onrender.com`: the exact service hostname used for customer `www` CNAME instructions.

Never expose or commit the Render API key. Render API keys are shown only once when created. Use the narrowest permissions that permit custom-domain management.

## DNS instructions shown to customers

For a root domain such as `example.com`:

- Apex/root: add an A record for `@` pointing to `216.24.57.1`.
- `www`: add a CNAME record pointing to `oni247-staging.onrender.com`.
- Add the TXT ownership challenge exactly as shown in the Oni247 dashboard.
- Remove conflicting AAAA records while configuring the domain.
- If restrictive CAA records exist, they must permit Let's Encrypt (`letsencrypt.org`) and Google Trust Services (`pki.goog`).

Render automatically adds and redirects the corresponding root or `www` hostname when one side is registered. The dashboard provides the records for the domain entered by the customer; users must make the DNS changes with their domain provider.

Oni247 verifies its TXT ownership challenge, registers the hostname with Render, requests DNS verification, and checks that a valid HTTPS certificate is presented before activating the domain.

## Cost and safety

Render includes a limited number of custom domains per workspace. Additional domains may incur a monthly charge. Confirm the current workspace allowance and domain count before enabling customer self-service at scale. Do not assume the service's Free compute plan determines the workspace's custom-domain allowance.

## Safe rollout

1. Configure the four server environment variables above; keep the Render API key private.
2. Apply migrations `003_business_domains.sql` and `004_render_domain_provisioning.sql` to the Oni247 Neon database using the existing migration runner.
3. Test a customer-owned domain on a non-critical business: confirm Free and trial-only accounts are denied; confirm an active paid One-Page or Premium Plus account can register; exercise the TXT ownership challenge, Render registration, routing DNS, Render verification, TLS readiness, primary selection, switching back to `/slug`, and removal.
4. Test paid-subscription expiry: confirm the custom domain stops resolving for both browser and crawler requests, sharing URLs fall back to `/slug`, and the `/slug` storefront remains available. Confirm renewal restores eligibility without deleting the saved domain record.
5. Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run audit:standalone` before merging.
6. Keep the default `/slug` route available regardless of custom-domain state.

No production DNS, Render settings, Neon data, or deployment is changed by this branch.
