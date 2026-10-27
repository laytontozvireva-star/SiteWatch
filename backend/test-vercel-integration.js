const test = require("node:test");
const assert = require("node:assert/strict");

process.env.VERCEL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
const {
  encryptToken, decryptToken, createState, createCodeVerifier, createCodeChallenge, hashState, verifyWebhookSignature, isDuplicateWebhookError,
} = require("./src/services/vercelCrypto");
const { isOwnedLink } = require("./src/services/vercelService");
const {
  MARKETPLACE_TOKEN_ENDPOINT,
  MarketplaceCallbackError,
  parseMarketplaceCallback,
  exchangeMarketplaceCode,
  assertTokenTeamMatches,
  saveMarketplaceInstallation,
} = require("./src/services/vercelMarketplaceService");
const crypto = require("crypto");

test("OAuth state is high entropy, bindable, and rejects a changed value", () => {
  const state = createState();
  assert.ok(state.length >= 40);
  assert.equal(hashState(state), hashState(state));
  assert.notEqual(hashState(state), hashState(`${state}changed`));
});

test("PKCE verifier creates a deterministic S256 challenge without exposing the verifier", () => {
  const verifier = createCodeVerifier();
  assert.ok(verifier.length >= 43);
  assert.equal(createCodeChallenge(verifier), createCodeChallenge(verifier));
  assert.notEqual(createCodeChallenge(verifier), createCodeChallenge(createCodeVerifier()));
});

test("Marketplace callback accepts Vercel's no-state parameters and validates the Vercel next URL", () => {
  const callback = parseMarketplaceCallback({
    source: "marketplace",
    code: "marketplace-code",
    configurationId: "icfg_abc123",
    teamId: "team_abc123",
    next: "https://vercel.com/dashboard/integrations",
  });
  assert.equal(callback.configurationId, "icfg_abc123");
  assert.equal(callback.teamId, "team_abc123");
  assert.equal(callback.next.hostname, "vercel.com");
  assert.equal(parseMarketplaceCallback({ source: "external", code: "x" }), null);
  assert.throws(
  () => parseMarketplaceCallback({
    source: "marketplace",
    code: "marketplace-code",
    configurationId: "icfg_abc123",
    teamId: "team_abc123",
    next: "https://attacker.example/continue",
  }),
  MarketplaceCallbackError
);
});

test("Marketplace token exchange uses Vercel v2 endpoint and documented form fields only", async () => {
  let request;
  const token = await exchangeMarketplaceCode(
    { code: "one-time-code", clientId: "client-id", clientSecret: "client-secret", redirectUri: "https://sitewatch.example/api/integrations/vercel/callback" },
    async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ access_token: "installation-token", team_id: "team_abc123" }) };
    }
  );
  assert.equal(request.url, MARKETPLACE_TOKEN_ENDPOINT);
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.body.toString(), "client_id=client-id&client_secret=client-secret&code=one-time-code&redirect_uri=https%3A%2F%2Fsitewatch.example%2Fapi%2Fintegrations%2Fvercel%2Fcallback");
  assert.equal(token.team_id, "team_abc123");
});

test("Marketplace token team must match the callback team scope", () => {
  assert.equal(assertTokenTeamMatches("team_abc123", "team_abc123"), "team_abc123");
  assert.throws(() => assertTokenTeamMatches("team_abc123", "team_other"), MarketplaceCallbackError);
});

test("Marketplace installation persistence upserts by configuration ID for retries", async () => {
  const calls = [];
  const database = {
    from: (table) => ({
      upsert: (row, options) => {
        calls.push({ table, row, options });
        return { select: () => ({ single: async () => ({ data: { id: "row", configuration_id: row.configuration_id, team_id: row.team_id }, error: null }) }) };
      },
    }),
  };
  await saveMarketplaceInstallation(database, { configurationId: "icfg_abc123", teamId: "team_abc123", accessToken: "token-one" });
  await saveMarketplaceInstallation(database, { configurationId: "icfg_abc123", teamId: "team_abc123", accessToken: "token-two" });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].table, "vercel_marketplace_installations");
  assert.equal(calls[0].options.onConflict, "configuration_id");
  assert.equal(calls[0].row.access_token_encrypted === "token-one", false);
  assert.equal(calls[0].row.configuration_id, calls[1].row.configuration_id);
});

test("Vercel tokens are encrypted at rest and can only be recovered with the configured key", () => {
  const encrypted = encryptToken("vercel-secret-token");
  assert.notEqual(encrypted, "vercel-secret-token");
  assert.equal(decryptToken(encrypted), "vercel-secret-token");
});

test("ownership checks never accept a link belonging to another SiteWatch user", () => {
  assert.equal(isOwnedLink({ owner_id: "user-a" }, "user-a"), true);
  assert.equal(isOwnedLink({ owner_id: "user-a" }, "user-b"), false);
  assert.equal(isOwnedLink(null, "user-a"), false);
});

test("webhook signature validation rejects tampered payloads", () => {
  const raw = Buffer.from('{"type":"deployment.succeeded"}');
  const secret = "webhook-secret";
  const signature = crypto.createHmac("sha1", secret).update(raw).digest("hex");
  assert.equal(verifyWebhookSignature(raw, signature, secret), true);
  assert.equal(verifyWebhookSignature(Buffer.from('{"type":"deployment.error"}'), signature, secret), false);
});

test("unique delivery violations are handled as idempotent webhook retries", () => {
  assert.equal(isDuplicateWebhookError({ code: "23505" }), true);
  assert.equal(isDuplicateWebhookError({ code: "500" }), false);
});
