
const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const logger = require("../utils/logger");

if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  throw new Error(
    "Supabase configuration is missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
}

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
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

    return {
      ok: !error,
      error: error ? error.message : null,
    };
  } catch (err) {
    logger.error("Supabase database connection check failed.", {
      message: err.message,
    });

    return {
      ok: false,
      error: err.message,
    };
  }
}

module.exports = {
  supabase,
  checkDatabaseConnection,
};
