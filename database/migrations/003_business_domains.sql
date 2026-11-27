-- Multi-domain registry for Oni247. It stores ownership verification and hostname-to-business mapping;
-- Render remains the DNS ingress and managed TLS provider.
BEGIN;

CREATE TABLE IF NOT EXISTS business_domains (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL,
  domain_type TEXT NOT NULL CHECK (domain_type = 'customer_domain'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','active','failed','disabled')),
  verification_token TEXT,
  verified_at TIMESTAMPTZ,
  ssl_status TEXT NOT NULL DEFAULT 'not_required' CHECK (ssl_status IN ('not_required','pending','active','failed')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  last_checked_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT business_domains_hostname_format CHECK (hostname = lower(hostname) AND hostname !~ '[[:space:]/:]')
);

CREATE UNIQUE INDEX IF NOT EXISTS business_domains_hostname_uq ON business_domains(hostname);
CREATE INDEX IF NOT EXISTS business_domains_business_idx ON business_domains(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS business_domains_one_primary_per_business_uq
  ON business_domains(business_id) WHERE is_primary = true;

-- Preserve existing verified custom domains during migration.
INSERT INTO business_domains (
  business_id, hostname, domain_type, status, verified_at, ssl_status, is_primary
)
SELECT
  id,
  lower(split_part(split_part(regexp_replace(custom_domain, '^https?://', '', 'i'), '/', 1), ':', 1)),
  'customer_domain',
  'verified',
  custom_domain_verified_at,
  'pending',
  false
FROM businesses
WHERE custom_domain IS NOT NULL
  AND custom_domain_status = 'verified'
  AND lower(custom_domain) NOT LIKE 'http://%'
ON CONFLICT (hostname) DO NOTHING;

COMMIT;
