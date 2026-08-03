/* Lets any logged-in petugas see and download the automatic daily backups,
   so at least one copy always ends up off the server too. */
const express = require("express");
const path = require("node:path");
const fs = require("node:fs");
const backup = require("../backup");

const router = express.Router();

// Filenames are always our own "app-<timestamp>.db" format - reject anything
// else so this can't be used to read arbitrary files off disk.
var SAFE_FILENAME = /^app-[0-9T-]+Z\.db$/;

router.get("/", function (req, res) {
  var files = backup.listBackups().map(function (filename) {
    var stat = fs.statSync(path.join(backup.BACKUP_DIR, filename));
    return { filename: filename, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
  });
  res.json({ backups: files });
});

router.post("/", function (req, res) {
  var filename = backup.createBackup();
  res.status(201).json({ filename: filename });
});

router.get("/:filename/download", function (req, res) {
  if (!SAFE_FILENAME.test(req.params.filename)) return res.status(400).json({ error: "Nama file tidak valid." });
  var target = path.join(backup.BACKUP_DIR, req.params.filename);
  if (!fs.existsSync(target)) return res.status(404).json({ error: "Backup tidak ditemukan." });
  res.download(target);
});

module.exports = router;
