-- SiteWatch Vercel integration. Run this migration in the same Supabase database
-- as the existing public.projects table before deploying these API routes.
CREATE TABLE IF NOT EXISTS public.vercel_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  vercel_user_id text,
  vercel_username text,
  access_token_encrypted text NOT NULL,
  token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vercel_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vercel_oauth_states_expiry_idx ON public.vercel_oauth_states(expires_at);

CREATE TABLE IF NOT EXISTS public.vercel_project_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sitewatch_project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  vercel_project_id text NOT NULL,
  vercel_project_key text NOT NULL UNIQUE,
  team_id text,
  project_name text NOT NULL,
  production_url text,
  latest_deployment_id text,
  latest_deployment_status text,
  latest_deployment_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vercel_project_links_owner_idx ON public.vercel_project_links(owner_id);

CREATE TABLE IF NOT EXISTS public.vercel_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  vercel_project_key text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

-- The backend uses the Supabase service role, but explicit RLS keeps these
-- credentials unreachable from browser clients if the database is queried directly.
ALTER TABLE public.vercel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vercel_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vercel_project_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vercel_webhook_events ENABLE ROW LEVEL SECURITY;
