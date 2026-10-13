const { supabase } = require("../services/supabase");
const { getProjectByApiKey } = require("../services/projectService");
const logger = require("../utils/logger");

/**
 * Middleware: Require valid Supabase user session token
 */
async function requireUser(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Please sign in to access this resource.",
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing.",
      });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        message: "Your session is invalid or expired. Please sign in again.",
      });
    }

    req.authUser = data.user;
    next();
  } catch (error) {
    logger.error("Authentication verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify your session.",
    });
  }
}

/**
 * Middleware: Verify SiteWatch project API key
 * Checks header 'x-sitewatch-key' or query/body fallback
 * Caches validated project and attaches to req.project
 */
async function requireApiKey(req, res, next) {
  try {
    const apiKey =
      req.get("x-sitewatch-key") ||
      req.query?.apiKey ||
      req.body?.apiKey;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "SiteWatch API key is required.",
      });
    }

    const project = await getProjectByApiKey(apiKey);

    if (!project) {
      return res.status(401).json({
        success: false,
        message: "Invalid SiteWatch API key.",
      });
    }

    req.project = project;
    req.apiKey = apiKey;
    next();
  } catch (error) {
    logger.error("API-key verification failed:", error);

    return res.status(500).json({
      success: false,
      message: "Could not verify the SiteWatch API key.",
    });
  }
}

module.exports = {
  requireUser,
  requireApiKey,
};
