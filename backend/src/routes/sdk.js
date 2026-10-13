const express = require("express");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

const router = express.Router();

// Candidate paths for SDK index.js
const sdkPaths = [
  path.resolve(__dirname, "../../../sdk/index.js"),
  path.resolve(__dirname, "../../sdk/index.js"),
];

let cachedSdkCode = null;
let cachedMtime = 0;

function getSdkScript() {
  for (const candidatePath of sdkPaths) {
    if (fs.existsSync(candidatePath)) {
      try {
        const stat = fs.statSync(candidatePath);
        if (!cachedSdkCode || stat.mtimeMs > cachedMtime) {
          cachedSdkCode = fs.readFileSync(candidatePath, "utf-8");
          cachedMtime = stat.mtimeMs;
        }
        return cachedSdkCode;
      } catch (err) {
        logger.warn("Error reading SDK file from disk:", err.message);
      }
    }
  }
  return cachedSdkCode;
}

/**
 * GET /sdk/sitewatch.js - Serves the client-side monitoring SDK
 */
router.get("/sitewatch.js", (req, res) => {
  const code = getSdkScript();

  if (!code) {
    return res.status(404).type("text/plain").send("// SiteWatch SDK script not found.");
  }

  res.set({
    "Content-Type": "application/javascript; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "public, max-age=3600",
  });

  return res.send(code);
});

module.exports = router;
