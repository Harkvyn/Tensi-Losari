/* Minimal cookie helpers so we don't need the `cookie-parser` package. */
const { SESSION_TTL_MS } = require("./auth");

const COOKIE_NAME = "session_token";

function parse(header) {
  var out = {};
  (header || "").split(";").forEach(function (pair) {
    var idx = pair.indexOf("=");
    if (idx === -1) return;
    var k = pair.slice(0, idx).trim();
    var v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function readToken(req) { return parse(req.headers.cookie).session_token || null; }

// `req.secure` is only trustworthy once `app.set('trust proxy', ...)` is
// configured to trust the reverse proxy's X-Forwarded-Proto header (see
// server.js and DEPLOYMENT.md) - otherwise it's always false behind a proxy.
function setToken(res, token, secure) {
  var maxAge = Math.floor(SESSION_TTL_MS / 1000);
  var attrs = "; HttpOnly; Path=/; Max-Age=" + maxAge + "; SameSite=Lax";
  if (secure) attrs += "; Secure";
  res.setHeader("Set-Cookie", COOKIE_NAME + "=" + token + attrs);
}

function clearToken(res, secure) {
  var attrs = "; HttpOnly; Path=/; Max-Age=0; SameSite=Lax";
  if (secure) attrs += "; Secure";
  res.setHeader("Set-Cookie", COOKIE_NAME + "=" + attrs);
}

module.exports = { readToken, setToken, clearToken };
