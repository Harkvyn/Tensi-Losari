const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("node:path");

const requireAuth = require("./src/middleware/requireAuth");
const authRoutes = require("./src/routes/auth");
const posyanduRoutes = require("./src/routes/posyandu");
const patientsRoutes = require("./src/routes/patients");
const readingsRoutes = require("./src/routes/readings");
const backupsRoutes = require("./src/routes/backups");
const backup = require("./src/backup");

const app = express();

// Trust the reverse proxy in front of this app (nginx/Caddy) for the
// X-Forwarded-Proto header, so req.secure is accurate and Secure cookies /
// rate-limit-by-IP work correctly. See DEPLOYMENT.md.
if (process.env.TRUST_PROXY) app.set("trust proxy", 1);

if (process.env.NODE_ENV === "production" && !process.env.INVITE_CODE) {
  console.warn("WARNING: INVITE_CODE is not set - anyone who can reach this server can register an account.");
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // 'unsafe-inline' here only relaxes inline style="" attributes (used
      // for dynamic chart colors/widths) - scriptSrc below stays strict.
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"]
    }
  }
}));
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

var authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." }
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/posyandu", posyanduRoutes);
app.use("/api/patients/:patientId/readings", requireAuth, readingsRoutes);
app.use("/api/patients", requireAuth, patientsRoutes);
app.use("/api/backups", requireAuth, backupsRoutes);

app.use("/api", function (req, res) { res.status(404).json({ error: "Not found." }); });

// Central error handler: never leak stack traces to the client, always log
// the real detail server-side for debugging.
app.use(function (err, req, res, next) {
  console.error(err);
  res.status(500).json({ error: "Terjadi kesalahan pada server." });
});

var PORT = process.env.PORT || 8532;
app.listen(PORT, function () {
  console.log("Pantau Tensi server running on http://localhost:" + PORT);

  // Daily automatic snapshot, kept in data/backups/ (see src/backup.js).
  // This alone is not a full backup strategy - it protects against
  // accidental deletion/corruption of the live file, not against losing
  // the whole machine. Download copies off-server regularly too.
  backup.createBackup();
  setInterval(backup.createBackup, 24 * 60 * 60 * 1000);
});
