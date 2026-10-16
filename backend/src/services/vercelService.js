const config = require("../config");
const { decryptToken } = require("./vercelCrypto");

const API = "https://api.vercel.com";

function configured() {
  return Boolean(config.vercel.clientId && config.vercel.clientSecret && config.vercel.redirectUri && config.vercel.tokenEncryptionKey);
}

async function vercelRequest(connection, path) {
  let token;
  try { token = decryptToken(connection.access_token_encrypted); } catch (error) {
    error.code = "TOKEN_DECRYPTION_FAILED";
    throw error;
  }
  const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || payload.message || "Vercel request failed.");
    error.status = response.status;
    error.code = response.status === 401 || response.status === 403 ? "VERCEL_AUTHORIZATION_INVALID" : "VERCEL_API_ERROR";
    throw error;
  }
  return payload;
}

function teamQuery(teamId) { return teamId ? `?teamId=${encodeURIComponent(teamId)}` : ""; }
function projectQuery(teamId) { return teamId ? `&teamId=${encodeURIComponent(teamId)}` : ""; }

async function getTeams(connection) { return vercelRequest(connection, "/v2/teams?limit=100"); }
async function getProjects(connection, teamId) { return vercelRequest(connection, `/v9/projects?limit=100${teamId ? `&teamId=${encodeURIComponent(teamId)}` : ""}`); }
async function getProject(connection, projectId, teamId) { return vercelRequest(connection, `/v9/projects/${encodeURIComponent(projectId)}${teamQuery(teamId)}`); }
async function getDeployments(connection, projectId, teamId) { return vercelRequest(connection, `/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=20${projectQuery(teamId)}`); }

function deploymentUrl(deployment) {
  const target = deployment?.alias?.[0] || deployment?.url;
  return target ? (target.startsWith("http") ? target : `https://${target}`) : null;
}

function isOwnedLink(link, ownerId) { return Boolean(link && link.owner_id === ownerId); }

module.exports = { configured, vercelRequest, getTeams, getProjects, getProject, getDeployments, deploymentUrl, isOwnedLink };
