import { createClient } from "@supabase/supabase-js";

// Production defaults ensure the app never crashes with a blank white page if env vars are unset
const DEFAULT_SUPABASE_URL = "https://ojmncwucrwlcztbemhoo.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbW5jd3VjcndsY3p0YmVtaG9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExOTI1MzYsImV4cCI6MjEwNjc2ODUzNn0.T2tmlmg5OnO30Ge2-cp6JDtED3y3uLb2hpLPGPI6eL8";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);