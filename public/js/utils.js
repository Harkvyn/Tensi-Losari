/* Shared formatting & domain helpers. No dependencies on other modules. */
var Utils = (function () {
  "use strict";

  var CATEGORIES = [
    { key: "crisis",       label: "Krisis Hipertensi",  color: "var(--c-crisis)",       test: function (s, d) { return s >= 180 || d >= 110; } },
    { key: "stage2",       label: "Hipertensi Tahap 2", color: "var(--c-stage2)",       test: function (s, d) { return s >= 160 || d >= 100; } },
    { key: "stage1",       label: "Hipertensi Tahap 1", color: "var(--c-stage1)",       test: function (s, d) { return s >= 140 || d >= 90; } },
    { key: "prehipertensi", label: "Pra-Hipertensi",    color: "var(--c-prehipertensi)", test: function (s, d) { return s >= 120 || d >= 80; } },
    { key: "normal",       label: "Normal",             color: "var(--c-normal)",       test: function () { return true; } }
  ];

  function classifyBP(systolic, diastolic) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].test(systolic, diastolic)) return CATEGORIES[i];
    }
    return CATEGORIES[CATEGORIES.length - 1];
  }

  function badgeClass(catKey) { return "b-" + catKey; }

  function uid(prefix) { return (prefix || "id") + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function fmtDateTime(iso) {
    var d = new Date(iso);
    return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function fmtDateShort(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  }
  function fmtDateLong(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  }
  function nowLocalInputValue() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  function ageFromBirthDate(birthDateStr) {
    if (!birthDateStr) return null;
    var b = new Date(birthDateStr + "T00:00:00");
    if (isNaN(b.getTime())) return null;
    var now = new Date();
    var age = now.getFullYear() - b.getFullYear();
    var m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return Math.max(age, 0);
  }

  function initials(name) {
    var parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function genderLabel(g) {
    if (g === "L") return "Laki-laki";
    if (g === "P") return "Perempuan";
    return "-";
  }

  function avg(arr) { return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : 0; }

  return {
    CATEGORIES: CATEGORIES,
    classifyBP: classifyBP,
    badgeClass: badgeClass,
    uid: uid,
    escapeHtml: escapeHtml,
    fmtDateTime: fmtDateTime,
    fmtDateShort: fmtDateShort,
    fmtDateLong: fmtDateLong,
    nowLocalInputValue: nowLocalInputValue,
    ageFromBirthDate: ageFromBirthDate,
    initials: initials,
    genderLabel: genderLabel,
    avg: avg
  };
})();
