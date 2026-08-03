/* Password hashing and session token helpers. Only built-in crypto - no
   native bindings to install. */
const crypto = require("node:crypto");

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SCRYPT_KEYLEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  const stored = Buffer.from(hash, "hex");
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

function createSessionToken() { return crypto.randomBytes(32).toString("hex"); }

function sessionExpiry() { return new Date(Date.now() + SESSION_TTL_MS).toISOString(); }

module.exports = { hashPassword, verifyPassword, createSessionToken, sessionExpiry, SESSION_TTL_MS };
