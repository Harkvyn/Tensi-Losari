/*
 * Database layer. Uses Node's built-in node:sqlite (no native module to
 * compile, no separate DB server to install) - a single file on disk.
 */
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, "app.db"));
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  -- One shared database for every posyandu in the kelurahan; each staff
  -- account and patient belongs to exactly one, so data never mixes
  -- between posts while backups/updates/deploys stay a single operation.
  CREATE TABLE IF NOT EXISTS posyandu (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS petugas (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    name TEXT NOT NULL,
    posyandu_id TEXT NOT NULL REFERENCES posyandu(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    petugas_id TEXT NOT NULL REFERENCES petugas(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    posyandu_id TEXT NOT NULL REFERENCES posyandu(id),
    name TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    gender TEXT,
    phone TEXT,
    note TEXT,
    created_by TEXT REFERENCES petugas(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS readings (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    systolic INTEGER NOT NULL,
    diastolic INTEGER NOT NULL,
    pulse INTEGER,
    note TEXT,
    date TEXT NOT NULL,
    created_by TEXT REFERENCES petugas(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );
`);

// Seed the 5 known posyandu once. Adding a 6th later is just another INSERT
// (or a future admin screen) - no code or schema change needed.
var POSYANDU_NAMES = [
  "Posyandu Kartini I",
  "Posyandu Fatmawati II",
  "Posyandu Dewi Sartika III",
  "Posyandu Dewi Sartika IV",
  "Posyandu Cut Nyak Dien"
];
var posyanduCount = db.prepare("SELECT COUNT(*) c FROM posyandu").get().c;
if (posyanduCount === 0) {
  var insertPosyandu = db.prepare("INSERT INTO posyandu (id, name) VALUES (?, ?)");
  POSYANDU_NAMES.forEach(function (name) { insertPosyandu.run(crypto.randomUUID(), name); });
}

module.exports = db;
