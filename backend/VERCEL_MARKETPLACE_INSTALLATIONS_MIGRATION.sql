-- Marketplace installations are not associated with a SiteWatch/Supabase user
-- during Vercel's redirect callback. They remain unclaimed until Stage 2 links
-- them through an authenticated SiteWatch configuration flow.
CREATE TABLE IF NOT EXISTS public.vercel_marketplace_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id text NOT NULL UNIQUE CHECK (configuration_id ~ '^icfg_[A-Za-z0-9]+$'),
  team_id text NULL CHECK (team_id IS NULL OR team_id ~ '^team_[A-Za-z0-9]+$'),
  sitewatch_owner_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  access_token_encrypted text NOT NULL,
  installation_source text NOT NULL DEFAULT 'marketplace' CHECK (installation_source = 'marketplace'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vercel_marketplace_installations_owner_idx
  ON public.vercel_marketplace_installations(sitewatch_owner_id)
  WHERE sitewatch_owner_id IS NOT NULL;

ALTER TABLE public.vercel_marketplace_installations ENABLE ROW LEVEL SECURITY;
