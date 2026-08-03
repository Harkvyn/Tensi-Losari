/* Petugas home: patient roster + quick counts. */
var DashboardView = (function () {
  "use strict";

  var searchTerm = "";

  function render() {
    var root = document.getElementById("view-root");
    root.innerHTML = template();
    bind();
    loadList();
  }

  function template() {
    return (
      '<section class="view">' +
        '<div class="summary-grid dash-summary-grid">' +
          '<div class="card summary-card">' +
            '<span class="card-label">Jumlah Pasien</span>' +
            '<div class="card-value-row"><span class="card-value" id="stat-total-patients">0</span></div>' +
            '<span class="card-sub">terdaftar di klinik ini</span>' +
          "</div>" +
          '<div class="card summary-card">' +
            '<span class="card-label">Perlu Perhatian</span>' +
            '<div class="card-value-row"><span class="card-value" id="stat-attention" style="color:var(--c-stage2)">0</span></div>' +
            '<span class="card-sub">tensi tinggi pada pengukuran terakhir</span>' +
          "</div>" +
        "</div>" +

        '<div class="toolbar">' +
          '<input type="search" id="patient-search" class="search-input" placeholder="Cari nama pasien...">' +
          '<button id="btn-add-patient" class="btn btn-primary">+ Tambah Pasien</button>' +
        "</div>" +

        '<div class="card list-card">' +
          '<h2>Daftar Pasien</h2>' +
          '<div id="patient-list" class="patient-list"><div class="empty-state"><p>Memuat data pasien...</p></div></div>' +
          '<div id="patient-empty" class="empty-state hidden">' +
            "<p>Belum ada pasien terdaftar.</p>" +
            '<button class="btn btn-primary" id="btn-add-patient-empty">Tambah Pasien Pertama</button>' +
          "</div>" +
        "</div>" +
      "</section>"
    );
  }

  function bind() {
    document.getElementById("patient-search").addEventListener("input", function (e) {
      searchTerm = e.target.value.trim().toLowerCase();
      renderList(cachedPatients);
    });
    document.getElementById("btn-add-patient").addEventListener("click", function () { Router.navigate("patients/new"); });
    var emptyBtn = document.getElementById("btn-add-patient-empty");
    if (emptyBtn) emptyBtn.addEventListener("click", function () { Router.navigate("patients/new"); });
  }

  var cachedPatients = [];

  function loadList() {
    Store.getPatients().then(function (patients) {
      cachedPatients = patients;
      renderList(patients);
    }).catch(function (err) {
      document.getElementById("patient-list").innerHTML = '<div class="empty-state"><p>' + Utils.escapeHtml(err.message) + "</p></div>";
    });
  }

  function renderList(patients) {
    document.getElementById("stat-total-patients").textContent = patients.length;

    var attention = patients.filter(function (p) {
      if (!p.latestReading) return false;
      var cat = Utils.classifyBP(p.latestReading.systolic, p.latestReading.diastolic).key;
      return cat === "stage2" || cat === "crisis";
    }).length;
    document.getElementById("stat-attention").textContent = attention;

    var filtered = searchTerm
      ? patients.filter(function (p) { return p.name.toLowerCase().indexOf(searchTerm) !== -1; })
      : patients;

    var listEl = document.getElementById("patient-list");
    var emptyEl = document.getElementById("patient-empty");

    if (patients.length === 0) {
      listEl.innerHTML = "";
      emptyEl.classList.remove("hidden");
      return;
    }
    emptyEl.classList.add("hidden");

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><p>Tidak ada pasien yang cocok dengan pencarian.</p></div>';
      return;
    }

    listEl.innerHTML = filtered.map(renderPatientRow).join("");
    listEl.querySelectorAll(".patient-row").forEach(function (row) {
      row.addEventListener("click", function () {
        Router.navigate("patients/" + row.getAttribute("data-id"));
      });
    });
  }

  function renderPatientRow(p) {
    var age = Utils.ageFromBirthDate(p.birthDate);
    var latest = p.latestReading;
    var badgeHtml, dateHtml;
    if (latest) {
      var cat = Utils.classifyBP(latest.systolic, latest.diastolic);
      badgeHtml = '<span class="badge ' + Utils.badgeClass(cat.key) + '">' + latest.systolic + "/" + latest.diastolic + " &middot; " + cat.label + "</span>";
      dateHtml = '<span class="entry-date">' + Utils.fmtDateShort(latest.date) + "</span>";
    } else {
      badgeHtml = '<span class="badge">Belum ada data</span>';
      dateHtml = "";
    }

    return (
      '<div class="patient-row" data-id="' + p.id + '">' +
        '<div class="patient-row-main">' +
          '<span class="avatar">' + Utils.escapeHtml(Utils.initials(p.name)) + "</span>" +
          '<div class="patient-row-meta">' +
            '<span class="patient-row-name">' + Utils.escapeHtml(p.name) + "</span>" +
            '<span class="patient-row-sub">' + (age !== null ? age + " tahun" : "-") + " &middot; " + Utils.genderLabel(p.gender) + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="patient-row-status">' +
          badgeHtml + dateHtml +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="chevron"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        "</div>" +
      "</div>"
    );
  }

  return { render: render };
})();
