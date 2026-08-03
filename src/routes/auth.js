const express = require("express");
const crypto = require("node:crypto");
const db = require("../db");
const { hashPassword, verifyPassword, createSessionToken, sessionExpiry } = require("../auth");
const cookies = require("../cookies");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

var findByUsername = db.prepare(
  "SELECT p.*, py.name as posyandu_name FROM petugas p JOIN posyandu py ON py.id = p.posyandu_id WHERE p.username = ?"
);
var findPosyandu = db.prepare("SELECT id FROM posyandu WHERE id = ?");
var insertPetugas = db.prepare(
  "INSERT INTO petugas (id, username, password_hash, password_salt, name, posyandu_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
);
var insertSession = db.prepare("INSERT INTO sessions (token, petugas_id, expires_at) VALUES (?, ?, ?)");
var deleteSession = db.prepare("DELETE FROM sessions WHERE token = ?");

function publicPetugas(row) {
  return { id: row.id, username: row.username, name: row.name, posyanduId: row.posyandu_id, posyanduName: row.posyandu_name };
}

function startSession(req, res, petugasId) {
  var token = createSessionToken();
  insertSession.run(token, petugasId, sessionExpiry());
  cookies.setToken(res, token, req.secure);
}

router.post("/register", function (req, res) {
  var inviteCode = String(req.body.inviteCode || "");
  var expectedInvite = process.env.INVITE_CODE || "";
  if (expectedInvite && inviteCode !== expectedInvite) {
    return res.status(403).json({ error: "Kode undangan salah." });
  }

  var username = String(req.body.username || "").trim().toLowerCase();
  var password = String(req.body.password || "");
  var name = String(req.body.name || "").trim();
  var posyanduId = String(req.body.posyanduId || "");

  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return res.status(400).json({ error: "Username 3-30 karakter, huruf/angka/titik/underscore/strip." });
  }
  if (password.length < 6) return res.status(400).json({ error: "Password minimal 6 karakter." });
  if (!name) return res.status(400).json({ error: "Nama wajib diisi." });
  if (!findPosyandu.get(posyanduId)) return res.status(400).json({ error: "Posyandu wajib dipilih." });
  if (findByUsername.get(username)) return res.status(409).json({ error: "Username sudah dipakai." });

  var id = crypto.randomUUID();
  var pw = hashPassword(password);
  insertPetugas.run(id, username, pw.hash, pw.salt, name, posyanduId, new Date().toISOString());
  startSession(req, res, id);
  res.status(201).json({ petugas: publicPetugas(findByUsername.get(username)) });
});

router.post("/login", function (req, res) {
  var username = String(req.body.username || "").trim().toLowerCase();
  var password = String(req.body.password || "");

  var row = findByUsername.get(username);
  if (!row || !verifyPassword(password, row.password_hash, row.password_salt)) {
    return res.status(401).json({ error: "Username atau password salah." });
  }
  startSession(req, res, row.id);
  res.json({ petugas: publicPetugas(row) });
});

router.post("/logout", function (req, res) {
  var token = cookies.readToken(req);
  if (token) deleteSession.run(token);
  cookies.clearToken(res, req.secure);
  res.status(204).end();
});

router.get("/me", requireAuth, function (req, res) {
  res.json({ petugas: req.petugas });
});

module.exports = router;
