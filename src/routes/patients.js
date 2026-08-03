const express = require("express");
const crypto = require("node:crypto");
const db = require("../db");

const router = express.Router();

var listWithLatest = db.prepare(`
  SELECT p.*,
    r.id AS r_id, r.systolic AS r_systolic, r.diastolic AS r_diastolic,
    r.pulse AS r_pulse, r.date AS r_date
  FROM patients p
  LEFT JOIN readings r ON r.id = (
    SELECT id FROM readings WHERE patient_id = p.id ORDER BY date DESC LIMIT 1
  )
  WHERE p.deleted_at IS NULL AND p.posyandu_id = ?
  ORDER BY p.name COLLATE NOCASE ASC
`);
// Scoping every lookup by posyandu_id (not just id) means a staff member
// from one posyandu can never read/edit/delete another posyandu's patient,
// even by guessing or leaking a patient id - a 404, not a 403, is returned,
// so existence in another posyandu isn't revealed either.
var getById = db.prepare("SELECT * FROM patients WHERE id = ? AND posyandu_id = ? AND deleted_at IS NULL");
var insertPatient = db.prepare(
  "INSERT INTO patients (id, posyandu_id, name, birth_date, gender, phone, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
var updatePatientStmt = db.prepare(
  "UPDATE patients SET name = ?, birth_date = ?, gender = ?, phone = ?, note = ? WHERE id = ? AND posyandu_id = ?"
);
// Soft delete: keep the row (and its reading history) so an accidental
// click can't permanently destroy a patient's medical record.
var softDeletePatientStmt = db.prepare("UPDATE patients SET deleted_at = ? WHERE id = ? AND posyandu_id = ?");

function toPatient(row) {
  return {
    id: row.id,
    name: row.name,
    birthDate: row.birth_date,
    gender: row.gender,
    phone: row.phone,
    note: row.note,
    createdAt: row.created_at
  };
}

function toPatientWithLatest(row) {
  var patient = toPatient(row);
  patient.latestReading = row.r_id
    ? { id: row.r_id, systolic: row.r_systolic, diastolic: row.r_diastolic, pulse: row.r_pulse, date: row.r_date }
    : null;
  return patient;
}

function validate(body) {
  var name = String(body.name || "").trim();
  var birthDate = String(body.birthDate || "").trim();
  if (!name) return "Nama wajib diisi.";
  if (!birthDate || isNaN(new Date(birthDate).getTime())) return "Tanggal lahir tidak valid.";
  if (new Date(birthDate).getTime() > Date.now()) return "Tanggal lahir tidak boleh di masa depan.";
  return null;
}

router.get("/", function (req, res) {
  res.json({ patients: listWithLatest.all(req.petugas.posyanduId).map(toPatientWithLatest) });
});

router.get("/:id", function (req, res) {
  var row = getById.get(req.params.id, req.petugas.posyanduId);
  if (!row) return res.status(404).json({ error: "Pasien tidak ditemukan." });
  res.json({ patient: toPatient(row) });
});

router.post("/", function (req, res) {
  var err = validate(req.body);
  if (err) return res.status(400).json({ error: err });

  var id = crypto.randomUUID();
  insertPatient.run(
    id,
    req.petugas.posyanduId,
    String(req.body.name).trim(),
    String(req.body.birthDate).trim(),
    req.body.gender || null,
    req.body.phone ? String(req.body.phone).trim() : null,
    req.body.note ? String(req.body.note).trim() : null,
    req.petugas.id,
    new Date().toISOString()
  );
  res.status(201).json({ patient: toPatient(getById.get(id, req.petugas.posyanduId)) });
});

router.put("/:id", function (req, res) {
  var existing = getById.get(req.params.id, req.petugas.posyanduId);
  if (!existing) return res.status(404).json({ error: "Pasien tidak ditemukan." });

  var err = validate(req.body);
  if (err) return res.status(400).json({ error: err });

  updatePatientStmt.run(
    String(req.body.name).trim(),
    String(req.body.birthDate).trim(),
    req.body.gender || null,
    req.body.phone ? String(req.body.phone).trim() : null,
    req.body.note ? String(req.body.note).trim() : null,
    req.params.id,
    req.petugas.posyanduId
  );
  res.json({ patient: toPatient(getById.get(req.params.id, req.petugas.posyanduId)) });
});

router.delete("/:id", function (req, res) {
  var existing = getById.get(req.params.id, req.petugas.posyanduId);
  if (!existing) return res.status(404).json({ error: "Pasien tidak ditemukan." });
  softDeletePatientStmt.run(new Date().toISOString(), req.params.id, req.petugas.posyanduId);
  res.status(204).end();
});

module.exports = router;
