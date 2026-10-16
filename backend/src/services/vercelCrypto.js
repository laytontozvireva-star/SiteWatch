const crypto = require("crypto");
const config = require("../config");

function getKey() {
  let key;
  try {
    key = Buffer.from(config.vercel.tokenEncryptionKey, "base64");
  } catch {
    key = Buffer.alloc(0);
  }
  if (key.length !== 32) {
    throw new Error("Vercel token encryption is not configured. Set VERCEL_TOKEN_ENCRYPTION_KEY to a base64 32-byte key.");
  }
  return key;
}

function encryptToken(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

function decryptToken(value) {
  const data = Buffer.from(value, "base64");
  if (data.length < 29) throw new Error("Stored Vercel token is invalid.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
}

function createState() {
  return crypto.randomBytes(32).toString("base64url");
}

function createCodeVerifier() {
  // RFC 7636 allows 43-128 URL-safe characters. 32 random bytes encode to 43.
  return crypto.randomBytes(32).toString("base64url");
}

function createCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function hashState(state) {
  return crypto.createHash("sha256").update(state).digest("hex");
}

function safeEqualHex(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const left = Buffer.from(actual, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function verifyWebhookSignature(rawBody, signature, secret) {
  if (!Buffer.isBuffer(rawBody) || !signature || !secret) return false;
  const expected = crypto.createHmac("sha1", secret).update(rawBody).digest("hex");
  return safeEqualHex(signature, expected);
}

function isDuplicateWebhookError(error) {
  // Postgres unique-violation is the durable idempotency signal for a delivery.
  return error?.code === "23505";
}

module.exports = { encryptToken, decryptToken, createState, createCodeVerifier, createCodeChallenge, hashState, verifyWebhookSignature, isDuplicateWebhookError };
