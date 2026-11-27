# Oni247 domain management rollout

## Current implementation in this branch

- Adds `business_domains`, a multi-domain registry with globally unique hostnames, ownership verification state, TLS state, and one primary-domain constraint per business.
- Backfills existing verified `businesses.custom_domain` values into the registry without deleting or rewriting the legacy columns.
- Adds authenticated endpoints:
  - `GET /_api/business/domains` — list domains belonging to the signed-in owner's business.
  - `POST /_api/business/domains` — register a customer-owned hostname and issue a DNS TXT ownership challenge.
  - `POST /_api/business/domains/verify` — verify the TXT challenge using DNS lookup.
- The normal browser host resolver and crawler renderer only route newly registered customer domains after both domain status and TLS status are `active`.
- Existing legacy verified domains continue to resolve during migration.

## Render responsibilities

Oni247's business subdomain mapping is application/database-owned. Render remains the current ingress and certificate issuer. Configure the platform apex and wildcard hostname in Render, and publish wildcard DNS for the platform domain to the Render service. Do this once; do not create a Render custom-domain entry for every business subdomain.

Required application environment:
- `PLATFORM_ROOT_DOMAIN=oni247.org`
- `CUSTOM_DOMAIN_CNAME_TARGET` must be the actual DNS target for the customer-domain ingress. Do not set a placeholder value.

## Customer-owned domains: important boundary

The TXT record proves control of a domain. It does not route traffic and does not provision HTTPS. The CNAME/A/ALIAS record must point to a real ingress target, and a trusted certificate must be provisioned before Oni247 marks the hostname active. Root/apex domains may require ALIAS/ANAME or provider-specific flattening; ordinary CNAME records are generally intended for subdomains such as `www`.

This branch deliberately does not mark a TXT-verified domain active and does not claim TLS is ready. A TLS provisioning integration and customer-facing domain settings UI are still required before customer-owned domains can be enabled end-to-end.

## Safe rollout

1. Apply migration `003_business_domains.sql` to the Oni247 Neon database using the existing migration runner.
2. Configure `PLATFORM_ROOT_DOMAIN` and the Render wildcard DNS/certificate once.
3. Validate `https://<business-slug>.oni247.org` with a published test business.
4. Build the dashboard domain UI and TLS-provider adapter.
5. Only after DNS and certificate checks pass, transition a customer domain to `status='active'` and `ssl_status='active'`.

No production DNS, Render settings, Neon data, or deployment is changed by this branch.
