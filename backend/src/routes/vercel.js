const crypto = require("crypto");
const express = require("express");
const { body, query, param } = require("express-validator");
const config = require("../config");
const { supabase } = require("../services/supabase");
const { requireUser } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { vercelIntegrationLimiter, vercelWebhookLimiter } = require("../middleware/rateLimiter");
const { createState, hashState, encryptToken, verifyWebhookSignature, isDuplicateWebhookError } = require("../services/vercelCrypto");
const { configured, getTeams, getProjects, getProject, getDeployments, deploymentUrl } = require("../services/vercelService");
const logger = require("../utils/logger");

const router = express.Router();
const webhookRouter = express.Router();

function unavailable(res) {
  return res.status(503).json({ success: false, code: "VERCEL_NOT_CONFIGURED", message: "Vercel integration is not configured on this server." });
}
function integrationError(res, error) {
  if (error.code === "VERCEL_AUTHORIZATION_INVALID") {
    return res.status(401).json({ success: false, code: error.code, message: "Your Vercel authorization has expired or was revoked. Reconnect Vercel to continue." });
  }
  logger.error("Vercel integration error:", error);
  return res.status(error.status || 500).json({ success: false, code: error.code || "VERCEL_INTEGRATION_ERROR", message: error.message || "Vercel integration request failed." });
}
async function connectionForUser(ownerId) {
  const { data, error } = await supabase.from("vercel_connections").select("*").eq("owner_id", ownerId).maybeSingle();
  if (error) throw error;
  return data;
}
async function ownedVercelProject(connection, projectId, teamId) {
  // Vercel itself enforces project/team membership for this token. A successful
  // lookup is the authoritative ownership check; clients never submit project data.
  return getProject(connection, projectId, teamId || undefined);
}

router.use((req, res, next) => {
  // This router is mounted under /api alongside the legacy route modules; do
  // not let its authentication middleware claim unrelated unknown API paths.
  if (!req.path.startsWith("/integrations/vercel/")) return next();
  // OAuth providers redirect the browser without our Authorization header. The
  // callback is instead authenticated by a one-time state created by requireUser.
  if (req.path === "/integrations/vercel/callback") return next();
  return requireUser(req, res, next);
}, vercelIntegrationLimiter);

router.get("/integrations/vercel/connect", async (req, res, next) => {
  try {
    if (!configured()) return unavailable(res);
    const state = createState();
    const { error } = await supabase.from("vercel_oauth_states").insert({
      owner_id: req.authUser.id,
      state_hash: hashState(state),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (error) throw error;
    const authorize = new URL("https://vercel.com/oauth/authorize");
    authorize.searchParams.set("client_id", config.vercel.clientId);
    authorize.searchParams.set("redirect_uri", config.vercel.redirectUri);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("state", state);
    // API access is constrained by the scopes selected in the Vercel integration
    // configuration (Projects and Deployments: Read; webhooks configured there).
    return res.json({ success: true, authorizationUrl: authorize.toString(), expiresInSeconds: 600 });
  } catch (error) { next(error); }
});

// The browser cannot attach a SiteWatch bearer token after Vercel redirects back.
// The one-time, hashed database state is created by requireUser above and binds this
// callback to exactly that authenticated SiteWatch user.
router.get("/integrations/vercel/callback", async (req, res, next) => {
  try {
    if (!configured()) return unavailable(res);
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!state || !code) return res.status(400).json({ success: false, code: "OAUTH_CALLBACK_INVALID", message: "Missing OAuth code or state." });
    const now = new Date().toISOString();
    const { data: oauthState, error: stateError } = await supabase
      .from("vercel_oauth_states").update({ used_at: now }).eq("state_hash", hashState(state)).is("used_at", null).gt("expires_at", now)
      .select("owner_id").maybeSingle();
    if (stateError) throw stateError;
    if (!oauthState) return res.status(400).json({ success: false, code: "OAUTH_STATE_INVALID", message: "OAuth state is invalid, expired, or already used." });

    const tokenResponse = await fetch("https://api.vercel.com/login/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ client_id: config.vercel.clientId, client_secret: config.vercel.clientSecret, code, redirect_uri: config.vercel.redirectUri }),
    });
    const token = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !token.access_token) return res.status(400).json({ success: false, code: "OAUTH_TOKEN_EXCHANGE_FAILED", message: "Vercel did not authorize this connection." });
    const userResponse = await fetch("https://api.vercel.com/v2/user", { headers: { Authorization: `Bearer ${token.access_token}` } });
    const userPayload = await userResponse.json().catch(() => ({}));
    if (!userResponse.ok) return res.status(400).json({ success: false, code: "OAUTH_USER_LOOKUP_FAILED", message: "Vercel authorization could not be verified." });
    const { error } = await supabase.from("vercel_connections").upsert({
      owner_id: oauthState.owner_id,
      vercel_user_id: userPayload.user?.id || userPayload.id || null,
      vercel_username: userPayload.user?.username || userPayload.username || null,
      access_token_encrypted: encryptToken(token.access_token),
      token_expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "owner_id" });
    if (error) throw error;
    return res.type("html").send(`<!doctype html><title>Vercel connected</title><body style="font-family:system-ui;display:grid;place-items:center;min-height:90vh;color:#172033"><main style="text-align:center"><h1>Vercel connected</h1><p>You can close this window and return to SiteWatch.</p></main><script>if(window.opener){window.opener.postMessage({type:'sitewatch:vercel-connected'},'*');window.close()}</script></body>`);
  } catch (error) { next(error); }
});

router.get("/integrations/vercel/status", async (req, res, next) => {
  try {
    const connection = await connectionForUser(req.authUser.id);
    const authorizationRequired = Boolean(connection?.token_expires_at && new Date(connection.token_expires_at).getTime() <= Date.now());
    return res.json({ success: true, connected: Boolean(connection), authorizationRequired, connection: connection ? { username: connection.vercel_username, connectedAt: connection.created_at, expiresAt: connection.token_expires_at } : null });
  } catch (error) { next(error); }
});

router.get("/integrations/vercel/links", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("vercel_project_links")
      .select("id, sitewatch_project_id, vercel_project_id, team_id, project_name, production_url, latest_deployment_status, latest_deployment_at, updated_at")
      .eq("owner_id", req.authUser.id)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return res.json({ success: true, links: data || [] });
  } catch (error) { next(error); }
});

router.delete("/integrations/vercel/disconnect", async (req, res, next) => {
  try {
    const { error } = await supabase.from("vercel_connections").delete().eq("owner_id", req.authUser.id);
    if (error) throw error;
    return res.json({ success: true, message: "Vercel account disconnected." });
  } catch (error) { next(error); }
});

router.get("/integrations/vercel/teams", async (req, res) => {
  try {
    const connection = await connectionForUser(req.authUser.id);
    if (!connection) return res.status(409).json({ success: false, code: "VERCEL_NOT_CONNECTED", message: "Connect Vercel before listing teams." });
    const data = await getTeams(connection);
    return res.json({ success: true, teams: data.teams || [], pagination: data.pagination || null });
  } catch (error) { return integrationError(res, error); }
});

router.get("/integrations/vercel/projects", validate([query("teamId").optional().isString().isLength({ max: 128 })]), async (req, res) => {
  try {
    const connection = await connectionForUser(req.authUser.id);
    if (!connection) return res.status(409).json({ success: false, code: "VERCEL_NOT_CONNECTED", message: "Connect Vercel before listing projects." });
    const data = await getProjects(connection, req.query.teamId);
    return res.json({ success: true, projects: data.projects || [], pagination: data.pagination || null });
  } catch (error) { return integrationError(res, error); }
});

router.get("/integrations/vercel/projects/:projectId/deployments", validate([param("projectId").isString().isLength({ min: 1, max: 128 }), query("teamId").optional().isString().isLength({ max: 128 })]), async (req, res) => {
  try {
    const connection = await connectionForUser(req.authUser.id);
    if (!connection) return res.status(409).json({ success: false, code: "VERCEL_NOT_CONNECTED", message: "Connect Vercel before listing deployments." });
    await ownedVercelProject(connection, req.params.projectId, req.query.teamId);
    const data = await getDeployments(connection, req.params.projectId, req.query.teamId);
    return res.json({ success: true, deployments: data.deployments || [], pagination: data.pagination || null });
  } catch (error) { return integrationError(res, error); }
});

router.post("/integrations/vercel/projects/:projectId/link", validate([
  param("projectId").isString().isLength({ min: 1, max: 128 }),
  body("teamId").optional({ nullable: true }).isString().isLength({ max: 128 }),
  body("sitewatchProjectId").optional({ nullable: true }).isUUID(),
]), async (req, res) => {
  try {
    const connection = await connectionForUser(req.authUser.id);
    if (!connection) return res.status(409).json({ success: false, code: "VERCEL_NOT_CONNECTED", message: "Connect Vercel before linking a project." });
    const vercelProject = await ownedVercelProject(connection, req.params.projectId, req.body.teamId);
    const deployments = await getDeployments(connection, req.params.projectId, req.body.teamId);
    const latest = (deployments.deployments || [])[0] || null;
    const url = deploymentUrl(latest) || (vercelProject.targets?.production?.url ? `https://${vercelProject.targets.production.url}` : null);
    let sitewatchProject;
    if (req.body.sitewatchProjectId) {
      const result = await supabase.from("projects").select("id, name, website_url").eq("id", req.body.sitewatchProjectId).eq("owner_id", req.authUser.id).maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return res.status(404).json({ success: false, message: "SiteWatch project not found." });
      sitewatchProject = result.data;
    } else {
      const result = await supabase.from("projects").insert({ name: vercelProject.name, website_url: url, api_key: `sw_${crypto.randomUUID()}`, owner_id: req.authUser.id }).select("id, name, website_url").single();
      if (result.error) throw result.error;
      sitewatchProject = result.data;
    }
    const teamId = req.body.teamId || null;
    const linkKey = `${teamId || "personal"}:${vercelProject.id}`;
    const existing = await supabase.from("vercel_project_links").select("owner_id").eq("vercel_project_key", linkKey).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data && existing.data.owner_id !== req.authUser.id) {
      return res.status(409).json({ success: false, code: "VERCEL_PROJECT_ALREADY_LINKED", message: "This Vercel project is already linked to another SiteWatch account." });
    }
    const link = {
      owner_id: req.authUser.id, sitewatch_project_id: sitewatchProject.id, vercel_project_id: vercelProject.id,
      vercel_project_key: linkKey, team_id: teamId, project_name: vercelProject.name,
      production_url: url, latest_deployment_id: latest?.uid || latest?.id || null, latest_deployment_status: latest?.state || latest?.readyState || "UNKNOWN",
      latest_deployment_at: latest?.createdAt ? new Date(latest.createdAt).toISOString() : null, updated_at: new Date().toISOString(),
    };
    const result = await supabase.from("vercel_project_links").upsert(link, { onConflict: "vercel_project_key" }).select("*").single();
    if (result.error) throw result.error;
    return res.status(201).json({ success: true, message: "Vercel project linked.", link: result.data, project: sitewatchProject });
  } catch (error) { return integrationError(res, error); }
});

router.delete("/integrations/vercel/projects/:projectId/link", validate([param("projectId").isString().isLength({ min: 1, max: 128 }), query("teamId").optional().isString().isLength({ max: 128 })]), async (req, res, next) => {
  try {
    const key = `${req.query.teamId || "personal"}:${req.params.projectId}`;
    const { data, error } = await supabase.from("vercel_project_links").delete().eq("owner_id", req.authUser.id).eq("vercel_project_key", key).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: "Vercel project link not found." });
    return res.json({ success: true, message: "Vercel project link removed." });
  } catch (error) { next(error); }
});

webhookRouter.post("/vercel", vercelWebhookLimiter, async (req, res, next) => {
  try {
    if (!config.vercel.webhookSecret) return unavailable(res);
    const signature = req.get("x-vercel-signature");
    if (!verifyWebhookSignature(req.body, signature, config.vercel.webhookSecret)) return res.status(403).json({ success: false, code: "INVALID_WEBHOOK_SIGNATURE", message: "Webhook signature verification failed." });
    const event = JSON.parse(req.body.toString("utf8"));
    const type = event.type;
    const states = { "deployment.created": "BUILDING", "deployment.succeeded": "READY", "deployment.error": "ERROR", "deployment.canceled": "CANCELED" };
    if (!states[type]) return res.status(202).json({ success: true, ignored: true });
    const deployment = event.payload?.deployment || event.deployment || {};
    const projectId = deployment.projectId || event.payload?.project?.id || event.projectId;
    const teamId = deployment.teamId || event.payload?.team?.id || event.teamId || null;
    if (!projectId) return res.status(400).json({ success: false, message: "Webhook deployment has no project ID." });
    const deliveryId = req.get("x-vercel-id") || event.id || crypto.createHash("sha256").update(req.body).digest("hex");
    const inserted = await supabase.from("vercel_webhook_events").insert({ delivery_id: deliveryId, event_type: type, vercel_project_key: `${teamId || "personal"}:${projectId}`, payload: event });
    if (isDuplicateWebhookError(inserted.error)) return res.status(200).json({ success: true, duplicate: true });
    if (inserted.error) throw inserted.error;
    const deploymentTime = deployment.createdAt || event.createdAt;
    const update = await supabase.from("vercel_project_links").update({
      latest_deployment_id: deployment.uid || deployment.id || null, latest_deployment_status: states[type],
      production_url: deploymentUrl(deployment), latest_deployment_at: deploymentTime ? new Date(deploymentTime).toISOString() : new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("vercel_project_key", `${teamId || "personal"}:${projectId}`);
    if (update.error) throw update.error;
    return res.status(200).json({ success: true });
  } catch (error) { next(error); }
});

module.exports = { router, webhookRouter };
