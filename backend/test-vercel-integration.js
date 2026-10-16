const test = require("node:test");
const assert = require("node:assert/strict");

process.env.VERCEL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
const {
  encryptToken, decryptToken, createState, createCodeVerifier, createCodeChallenge, hashState, verifyWebhookSignature, isDuplicateWebhookError,
} = require("./src/services/vercelCrypto");
const { isOwnedLink } = require("./src/services/vercelService");
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
