const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const logger = require("../utils/logger");

if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  logger.error(
    "Supabase configuration is missing. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
  );
}

const supabase = createClient(
  config.supabase.url || "https://placeholder.supabase.co",
  config.supabase.serviceRoleKey || "placeholder_key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Perform a fast ping against the database to verify connectivity.
 */
async function checkDatabaseConnection() {
  try {
    const { error } = await supabase.from("projects").select("id").limit(1);
    return { ok: !error, error: error ? error.message : null };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  supabase,
  checkDatabaseConnection,
};
