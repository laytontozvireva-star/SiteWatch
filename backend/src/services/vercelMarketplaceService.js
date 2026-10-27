const config = require("../config");
const { encryptToken } = require("./vercelCrypto");

const MARKETPLACE_TOKEN_ENDPOINT = "https://api.vercel.com/v2/oauth/access_token";
const ALLOWED_NEXT_HOSTS = new Set(["vercel.com", "www.vercel.com"]);

class MarketplaceCallbackError extends Error {
  constructor(message, code = "VERCEL_MARKETPLACE_CALLBACK_INVALID", status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function stringQueryValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateNextUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new MarketplaceCallbackError("Marketplace completion URL is invalid.");
  }
  if (
    url.protocol !== "https:" ||
    !ALLOWED_NEXT_HOSTS.has(url.hostname) ||
    url.port ||
    url.username ||
    url.password
  ) {
    throw new MarketplaceCallbackError("Marketplace completion URL is not allowed.");
  }
  return url;
}

function parseMarketplaceCallback(query) {
  if (stringQueryValue(query.source) !== "marketplace") return null;

  const code = stringQueryValue(query.code);
  const configurationId = stringQueryValue(query.configurationId);
  const teamId = stringQueryValue(query.teamId) || null;
  const next = validateNextUrl(stringQueryValue(query.next));

  if (!code || code.length > 2048) {
    throw new MarketplaceCallbackError("Marketplace authorization code is missing or invalid.");
  }
  if (!/^icfg_[A-Za-z0-9]+$/.test(configurationId)) {
    throw new MarketplaceCallbackError("Marketplace configuration ID is missing or invalid.");
  }
  if (teamId && !/^team_[A-Za-z0-9]+$/.test(teamId)) {
    throw new MarketplaceCallbackError("Marketplace team ID is invalid.");
  }
  return { code, configurationId, teamId, next };
}

function marketplaceTokenBody({ code, clientId = config.vercel.clientId, clientSecret = config.vercel.clientSecret, redirectUri = config.vercel.redirectUri }) {
  return new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });
}

async function exchangeMarketplaceCode(input, fetchImpl = fetch) {
  const response = await fetchImpl(MARKETPLACE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: marketplaceTokenBody(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.access_token !== "string" || !payload.access_token) {
    throw new MarketplaceCallbackError("Vercel could not authorize this Marketplace installation.", "VERCEL_MARKETPLACE_TOKEN_EXCHANGE_FAILED", 400);
  }
  return payload;
}

function assertTokenTeamMatches(callbackTeamId, tokenTeamId) {
  const normalizedTokenTeamId = typeof tokenTeamId === "string" && tokenTeamId ? tokenTeamId : null;
  if (callbackTeamId && callbackTeamId !== normalizedTokenTeamId) {
    throw new MarketplaceCallbackError("Marketplace team scope could not be verified.");
  }
  return normalizedTokenTeamId;
}

async function saveMarketplaceInstallation(database, { configurationId, teamId, accessToken }) {
  const { data, error } = await database
    .from("vercel_marketplace_installations")
    .upsert(
      {
        configuration_id: configurationId,
        team_id: teamId,
        access_token_encrypted: encryptToken(accessToken),
        installation_source: "marketplace",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "configuration_id" }
    )
    .select("id, configuration_id, team_id")
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  MARKETPLACE_TOKEN_ENDPOINT,
  MarketplaceCallbackError,
  parseMarketplaceCallback,
  marketplaceTokenBody,
  exchangeMarketplaceCode,
  assertTokenTeamMatches,
  saveMarketplaceInstallation,
};
