-- Store Render's custom-domain resource and verification state for managed TLS.
BEGIN;
ALTER TABLE business_domains
  ADD COLUMN IF NOT EXISTS render_custom_domain_id TEXT,
  ADD COLUMN IF NOT EXISTS render_verification_status TEXT NOT NULL DEFAULT 'not_registered'
    CHECK (render_verification_status IN ('not_registered','unverified','verified','error'));
CREATE UNIQUE INDEX IF NOT EXISTS business_domains_render_domain_id_uq
  ON business_domains(render_custom_domain_id)
  WHERE render_custom_domain_id IS NOT NULL;
COMMIT;
