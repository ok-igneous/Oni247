# Oni247 Cloudflare deployment plan

## Decision

Keep the existing Node.js 22 + Fastify application intact and deploy it as a Cloudflare Container, fronted by a thin Cloudflare Worker using the Containers API. Do not attempt to upload the Fastify server directly as a normal Worker or Pages Function.

This is the lowest-risk route because the current server depends on Node APIs, recursive filesystem endpoint discovery, dynamic TypeScript module imports, PostgreSQL TCP connections, SMTP/Nodemailer, and a local built frontend directory. Rewriting those boundaries for the Workers runtime would be a separate backend migration with a larger regression surface.

Cloudflare Containers are available on Workers Paid and are managed through a Worker/Durable Object. The Worker must forward requests to the container and expose the intended public hostnames. See:
- https://developers.cloudflare.com/containers/
- https://developers.cloudflare.com/containers/get-started/
- https://developers.cloudflare.com/containers/guides/deploy/
- https://developers.cloudflare.com/containers/api/container-class/
- https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/

## Target topology

```
Browser
  |
  | HTTPS: apex, platform subdomain, or verified customer domain
  v
Cloudflare DNS / TLS / edge security
  |
  v
Cloudflare Worker (host routing + container proxy)
  |
  v
Cloudflare Container (Node.js 22 + Fastify + Vite dist)
  |                    |
  |                    +--> PostgreSQL (existing schema; private credentials)
  |
  +--> Cloudflare R2 (S3-compatible media storage)
  |
  +--> SMTP / payment providers / external email webhooks
```

The container filesystem is ephemeral. Do not store customer uploads, database files, sessions, or other durable application data on its local disk. PostgreSQL remains the source of truth; R2 stores uploaded objects.

## Required Cloudflare resources

- A Cloudflare account on a plan that includes Containers.
- An authoritative Cloudflare zone for the actual Oni247 root domain.
- Wildcard DNS and TLS coverage for platform subdomains.
- A Worker and its Container/Durable Object configuration.
- An R2 bucket and a public asset hostname (or a deliberately selected private delivery design).
- A PostgreSQL destination reachable securely from the container.
- Cloudflare for SaaS custom-hostname onboarding if customers attach their own domains at scale.
- Worker/container secrets for production values; never commit credentials.

Do not assume a domain name is owned or configured. Verify domain ownership and DNS before changing records.

## Runtime requirements

The container must:
- Run Node.js 22 or a tested compatible LTS image.
- Install the exact dependency graph from a committed lockfile.
- Build the React/Vite frontend before runtime.
- Start the existing Fastify server on the container's assigned port and bind to 0.0.0.0.
- Pass readiness checks only after the API and required dependencies are usable.
- Handle SIGTERM and close PostgreSQL pools gracefully.
- Expose only the application HTTP port.
- Keep database, SMTP, payment and storage secrets outside the image.

The Worker/Container adapter must:
- Forward the original request method, path, query, headers, cookies and body without corrupting binary uploads or webhook signatures.
- Preserve response status, multiple Set-Cookie headers, redirects and streaming where supported.
- Pass the original hostname through a trusted mechanism; do not trust arbitrary client-supplied forwarded-host headers.
- Use explicit readiness/startup behavior and a bounded timeout.
- Avoid relying on container-local filesystem state between requests or restarts.

## Domain model

- Apex domain serves the Oni247 marketing/registration site.
- `{business-slug}.{root-domain}` resolves a published business by slug.
- A customer custom domain resolves only after ownership verification and TLS activation.
- Unknown, suspended, unverified or unpublished hosts must not resolve to a business.
- Domain-to-business mapping must not be cached longer than the revocation/verification model safely permits.
- Reserve platform hostnames such as `www`, `api`, `admin`, `mail`, and `assets`; prevent business slugs from colliding with them.

## Database and security gates

Do not point the new app at the old live production database as a shortcut.

Before RLS activation:
1. Export and inspect the real source schema.
2. Restore into a separate destination database.
3. Compare tables, columns, enums, constraints, indexes, sequences and row counts.
4. Provision a non-owner runtime role without BYPASSRLS.
5. Complete request-context, connection-reuse, nested transaction, rollback and concurrency tests.
6. Resolve every public route's least-privilege access path.
7. Implement and test the narrow trusted checkout/order/payment operations. Broad anonymous access to orders, customers or payment gateways is prohibited.
8. Apply RLS only to a disposable clone first, then staging after acceptance.

The staged RLS migration is not production-ready and must remain unapplied until all these gates pass.

## Release sequence

1. Complete the standalone audit and resolve all blocking Floot/runtime assumptions.
2. Generate and commit a lockfile; add a reproducible production container build.
3. Run dependency installation, audit, typecheck, unit tests and production build.
4. Run the API against a disposable PostgreSQL clone and test every route family.
5. Finish database/RLS and checkout security work.
6. Migrate media to R2 and verify object counts/checksums and rewritten URLs.
7. Build and test the Worker/Container adapter locally.
8. Configure a separate staging Worker, staging database and staging bucket.
9. Run full end-to-end and tenant-isolation acceptance tests.
10. Configure production DNS, TLS, custom hostnames, secrets and webhooks.
11. Deploy production without switching customer traffic.
12. Verify health, logs, payment callbacks, email, media, domains and backups.
13. Schedule a controlled final database/media delta migration and cutover.
14. Keep Floot and its data recoverable until explicit acceptance.

## Current blockers observed

- The GitHub branch has no package lockfile, so the production dependency install is not yet reproducible.
- The repository has no Dockerfile or Cloudflare Worker/Container adapter.
- The repository has no Cloudflare deployment configuration.
- The Cloudflare account connected during this review returned no configured DNS zones. No domain can be bound until the correct domain is added and verified.
- No production database export/destination credentials or R2 credentials were supplied to this repository review.
- The RLS migration is staged but unapplied; its own README lists unresolved public checkout, booking, comments/reactions and media access paths.
- No successful build, typecheck, integration test, database migration or deployment has been established by this document.

## Rollback

Do not delete the Floot app, its database, media, DNS records or payment webhooks during initial launch. Keep a reversible DNS/traffic cutover plan, preserve a final source database backup, and define a tested rollback trigger before production traffic moves.
