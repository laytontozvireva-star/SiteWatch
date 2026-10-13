const { supabase } = require("./supabase");
const { projectKeyCache, originProjectsCache } = require("./cache");
const logger = require("../utils/logger");

/**
 * Find project by API key with in-memory caching
 */
async function getProjectByApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    return null;
  }

  const trimmedKey = apiKey.trim();
  if (!trimmedKey) return null;

  // Check cache first
  const cached = projectKeyCache.get(trimmedKey);
  if (cached !== null) {
    return cached.exists ? cached.project : null;
  }

  try {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, website_url, owner_id")
      .eq("api_key", trimmedKey)
      .maybeSingle();

    if (error) {
      logger.error("Database query failed while fetching project by API key:", error);
      throw new Error("Could not verify project API key.");
    }

    if (data) {
      projectKeyCache.set(trimmedKey, { exists: true, project: data });
      return data;
    } else {
      // Negative cache for 10s to prevent rapid brute-force hitting Postgres
      projectKeyCache.set(trimmedKey, { exists: false, project: null }, 10000);
      return null;
    }
  } catch (err) {
    logger.error("Project lookup error:", err);
    throw err;
  }
}

/**
 * Find project by origin URL with caching
 */
async function getProjectByOrigin(requestOrigin) {
  if (!requestOrigin) return null;

  const cached = originProjectsCache.get(requestOrigin);
  if (cached !== null) {
    return cached.exists ? cached.project : null;
  }

  try {
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, name, website_url");

    if (error) {
      logger.error("Database query failed while fetching projects by origin:", error);
      throw new Error("Could not verify website origin.");
    }

    const matched = (projects || []).find((item) => {
      if (!item.website_url) return false;
      try {
        const cleanUrl = item.website_url.trim();
        const candidate = cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")
          ? cleanUrl
          : `https://${cleanUrl}`;
        return new URL(candidate).origin === requestOrigin;
      } catch {
        return false;
      }
    });

    if (matched) {
      originProjectsCache.set(requestOrigin, { exists: true, project: matched });
      return matched;
    } else {
      originProjectsCache.set(requestOrigin, { exists: false, project: null }, 15000);
      return null;
    }
  } catch (err) {
    logger.error("Origin lookup error:", err);
    throw err;
  }
}

/**
 * Invalidate cached project entry (e.g., when updated or deleted)
 */
function invalidateProjectKey(apiKey) {
  if (apiKey) {
    projectKeyCache.delete(apiKey.trim());
  }
  originProjectsCache.clear();
}

module.exports = {
  getProjectByApiKey,
  getProjectByOrigin,
  invalidateProjectKey,
};
