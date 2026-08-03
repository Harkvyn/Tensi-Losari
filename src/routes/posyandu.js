/* Public (no login needed) so the registration form can list posyandu
   options before a petugas has an account. Just names - nothing sensitive. */
const express = require("express");
const db = require("../db");

const router = express.Router();

var listAll = db.prepare("SELECT id, name FROM posyandu ORDER BY name COLLATE NOCASE ASC");

router.get("/", function (req, res) {
  res.json({ posyandu: listAll.all() });
});

module.exports = router;
