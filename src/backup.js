/*
 * Consistent snapshots of the live database via SQLite's VACUUM INTO -
 * safe to run while the server is handling requests. Used both by the
 * daily in-process schedule (server.js) and the admin download endpoint.
 */
const path = require("node:path");
const fs = require("node:fs");
const db = require("./db");

const BACKUP_DIR = path.join(__dirname, "..", "data", "backups");
const RETENTION_COUNT = 30; // keep the last 30 snapshots, prune older ones

function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function listBackups() {
  ensureDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter(function (f) { return f.endsWith(".db"); })
    .sort()
    .reverse();
}

function prune() {
  var files = listBackups().sort(); // oldest first
  while (files.length > RETENTION_COUNT) {
    fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
  }
}

function createBackup() {
  ensureDir();
  var filename = "app-" + timestamp() + ".db";
  var target = path.join(BACKUP_DIR, filename);
  var safePath = target.replace(/\\/g, "/").replace(/'/g, "''");
  db.exec("VACUUM INTO '" + safePath + "'");
  prune();
  return filename;
}

module.exports = { createBackup, listBackups, BACKUP_DIR };
