-- Keep resolved errors in history while recording when each was marked done.
ALTER TABLE public.errors
ADD COLUMN IF NOT EXISTS resolved_at timestamptz NULL;
