-- Required for existing deployments that already ran VERCEL_INTEGRATION_MIGRATION.sql.
-- Stores the one-time PKCE verifier encrypted until Vercel redirects back.
ALTER TABLE public.vercel_oauth_states
ADD COLUMN IF NOT EXISTS code_verifier_encrypted text;
