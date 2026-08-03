/* Mounted at /api/patients/:patientId/readings (see server.js). */
const express = require("express");
const crypto = require("node:crypto");
const db = require("../db");

const router = express.Router({ mergeParams: true });

var getPatient = db.prepare("SELECT id FROM patients WHERE id = ? AND posyandu_id = ? AND deleted_at IS NULL");
var listByPatient = db.prepare("SELECT * FROM readings WHERE patient_id = ? ORDER BY date DESC");
var insertReading = db.prepare(
  "INSERT INTO readings (id, patient_id, systolic, diastolic, pulse, note, date, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
);

function toReading(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    systolic: row.systolic,
    diastolic: row.diastolic,
    pulse: row.pulse,
    note: row.note,
    date: row.date
  };
}

function validate(body) {
  var s = Number(body.systolic), d = Number(body.diastolic);
  if (!body.date || isNaN(new Date(body.date).getTime())) return "Tanggal & waktu tidak valid.";
  if (!s || !d) return "Sistolik dan diastolik wajib diisi.";
  if (s < 60 || s > 260 || d < 40 || d > 160) return "Nilai di luar rentang wajar.";
  if (d >= s) return "Diastolik harus lebih kecil dari sistolik.";
  return null;
}

router.use(function (req, res, next) {
  if (!getPatient.get(req.params.patientId, req.petugas.posyanduId)) return res.status(404).json({ error: "Pasien tidak ditemukan." });
  next();
});

router.get("/", function (req, res) {
  res.json({ readings: listByPatient.all(req.params.patientId).map(toReading) });
});

router.post("/", function (req, res) {
  var err = validate(req.body);
  if (err) return res.status(400).json({ error: err });

  var id = crypto.randomUUID();
  var pulse = req.body.pulse ? Number(req.body.pulse) : null;
  insertReading.run(
    id,
    req.params.patientId,
    Number(req.body.systolic),
    Number(req.body.diastolic),
    pulse,
    req.body.note ? String(req.body.note).trim() : null,
    new Date(req.body.date).toISOString(),
    req.petugas.id,
    new Date().toISOString()
  );
  res.status(201).json({ reading: toReading(listByPatient.all(req.params.patientId)[0]) });
});

module.exports = router;
