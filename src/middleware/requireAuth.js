const db = require("../db");
const cookies = require("../cookies");

var findSession = db.prepare(
  "SELECT s.petugas_id as petugasId, s.expires_at as expiresAt, " +
  "p.id, p.username, p.name, p.posyandu_id as posyanduId, py.name as posyanduName " +
  "FROM sessions s " +
  "JOIN petugas p ON p.id = s.petugas_id " +
  "JOIN posyandu py ON py.id = p.posyandu_id " +
  "WHERE s.token = ?"
);
var deleteSession = db.prepare("DELETE FROM sessions WHERE token = ?");

module.exports = function requireAuth(req, res, next) {
  var token = cookies.readToken(req);
  if (!token) return res.status(401).json({ error: "Belum login." });

  var row = findSession.get(token);
  if (!row) return res.status(401).json({ error: "Sesi tidak valid. Silakan login kembali." });

  if (new Date(row.expiresAt).getTime() < Date.now()) {
    deleteSession.run(token);
    return res.status(401).json({ error: "Sesi kedaluwarsa. Silakan login kembali." });
  }

  req.petugas = {
    id: row.id, username: row.username, name: row.name,
    posyanduId: row.posyanduId, posyanduName: row.posyanduName
  };
  req.sessionToken = token;
  next();
};
