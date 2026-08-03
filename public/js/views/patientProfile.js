/* Single patient: header + 3 tabs (riwayat / tambah / statistik). */
var PatientProfileView = (function () {
  "use strict";

  var TABS = [
    { key: "riwayat", label: "Riwayat" },
    { key: "tambah", label: "Tambah Data" },
    { key: "statistik", label: "Statistik" }
  ];

  var statsRange = "30";

  function render(params) {
    var root = document.getElementById("view-root");
    root.innerHTML = '<div class="card"><div class="empty-state"><p>Memuat data pasien...</p></div></div>';

    Store.getPatient(params.id).then(function (patient) {
      var tab = params.tab && TABS.some(function (t) { return t.key === params.tab; }) ? params.tab : "riwayat";
      root.innerHTML = shellTemplate(patient, tab);
      bindShell(patient);
      renderTab(patient, tab);
    }).catch(function () { Router.navigate("dashboard"); });
  }

  function shellTemplate(patient, activeTab) {
    var age = Utils.ageFromBirthDate(patient.birthDate);
    return (
      '<section class="view">' +
        '<button class="btn btn-ghost btn-sm back-btn" id="btn-back-dashboard">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          "Kembali ke Dashboard" +
        "</button>" +

        '<div class="card profile-header">' +
          '<span class="avatar avatar-lg">' + Utils.escapeHtml(Utils.initials(patient.name)) + "</span>" +
          '<div class="profile-header-info">' +
            "<h2>" + Utils.escapeHtml(patient.name) + "</h2>" +
            '<p class="profile-header-meta">' +
              (age !== null ? age + " tahun" : "-") + " &middot; " + Utils.genderLabel(patient.gender) +
              (patient.phone ? " &middot; " + Utils.escapeHtml(patient.phone) : "") +
            "</p>" +
            (patient.note ? '<p class="profile-header-note">' + Utils.escapeHtml(patient.note) + "</p>" : "") +
          "</div>" +
          '<div class="profile-header-actions">' +
            '<button class="btn btn-ghost btn-sm" id="btn-edit-patient">Edit</button>' +
            '<button class="link-danger-sm" id="btn-delete-patient">Hapus</button>' +
          "</div>" +
        "</div>" +

        '<nav class="tabbar in-page-tabbar">' +
          TABS.map(function (t) {
            return '<button class="tab-btn' + (t.key === activeTab ? " active" : "") + '" data-tab="' + t.key + '">' + t.label + "</button>";
          }).join("") +
        "</nav>" +

        '<div id="tab-content"></div>' +
      "</section>"
    );
  }

  function bindShell(patient) {
    document.getElementById("btn-back-dashboard").addEventListener("click", function () { Router.navigate("dashboard"); });
    document.getElementById("btn-edit-patient").addEventListener("click", function () { Router.navigate("patients/" + patient.id + "/edit"); });
    document.getElementById("btn-delete-patient").addEventListener("click", function () {
      if (confirm('Hapus pasien "' + patient.name + '" beserta seluruh riwayat tensinya? Tindakan ini tidak bisa dibatalkan.')) {
        Store.deletePatient(patient.id).then(function () {
          Toast.show("Pasien dihapus");
          Router.navigate("dashboard");
        }).catch(function (err) { Toast.show(err.message); });
      }
    });
    document.querySelectorAll(".in-page-tabbar .tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { Router.navigate("patients/" + patient.id + "/" + btn.getAttribute("data-tab")); });
    });
  }

  function renderTab(patient, tab) {
    var container = document.getElementById("tab-content");
    if (tab === "tambah") { container.innerHTML = tambahTemplate(); bindTambah(patient); return; }

    container.innerHTML = '<div class="card"><div class="empty-state"><p>Memuat...</p></div></div>';
    Store.getReadings(patient.id).then(function (readings) {
      if (tab === "riwayat") { container.innerHTML = riwayatTemplate(patient, readings); bindRiwayat(patient); }
      if (tab === "statistik") { container.innerHTML = statistikTemplate(); bindStatistik(patient, readings); }
    }).catch(function (err) {
      container.innerHTML = '<div class="card"><div class="empty-state"><p>' + Utils.escapeHtml(err.message) + "</p></div></div>";
    });
  }

  // ---------------- Riwayat ----------------
  function riwayatTemplate(patient, readings) {
    if (readings.length === 0) {
      return (
        '<div class="card">' +
          '<div class="empty-state">' +
            "<p>Belum ada riwayat tensi untuk pasien ini.</p>" +
            '<button class="btn btn-primary" id="btn-goto-tambah">+ Tambah Data Pertama</button>' +
          "</div>" +
        "</div>"
      );
    }

    var latest = readings[0];
    var cat = Utils.classifyBP(latest.systolic, latest.diastolic);
    return (
      '<div class="summary-grid dash-summary-grid">' +
        '<div class="card summary-card">' +
          '<span class="card-label">Pengukuran Terakhir</span>' +
          '<div class="card-value-row"><span class="card-value">' + latest.systolic + "/" + latest.diastolic + '</span><span class="badge ' + Utils.badgeClass(cat.key) + '">' + cat.label + "</span></div>" +
          '<span class="card-sub">' + Utils.fmtDateTime(latest.date) + "</span>" +
        "</div>" +
        '<div class="card summary-card">' +
          '<span class="card-label">Total Catatan</span>' +
          '<div class="card-value-row"><span class="card-value">' + readings.length + "</span></div>" +
          '<span class="card-sub">pengukuran tersimpan</span>' +
        "</div>" +
      "</div>" +
      '<div class="card list-card">' +
        '<div class="list-card-head"><h2>Riwayat Tensi</h2><button class="btn btn-primary btn-sm" id="btn-goto-tambah">+ Tambah Data</button></div>' +
        '<div class="entry-list">' + readings.map(entryRow).join("") + "</div>" +
      "</div>"
    );
  }

  function entryRow(e) {
    var cat = Utils.classifyBP(e.systolic, e.diastolic);
    var pulseHtml = e.pulse ? '<span class="entry-pulse">' + e.pulse + " bpm</span>" : "";
    var noteHtml = e.note ? '<span class="entry-note">' + Utils.escapeHtml(e.note) + "</span>" : "";
    return (
      '<div class="entry-row">' +
        '<div class="entry-main">' +
          '<span class="entry-values">' + e.systolic + "/" + e.diastolic + "</span>" +
          '<span class="badge ' + Utils.badgeClass(cat.key) + '">' + cat.label + "</span>" +
        "</div>" +
        '<div class="entry-meta"><span class="entry-date">' + Utils.fmtDateTime(e.date) + "</span>" + noteHtml + "</div>" +
        pulseHtml +
      "</div>"
    );
  }

  function bindRiwayat(patient) {
    var btn = document.getElementById("btn-goto-tambah");
    if (btn) btn.addEventListener("click", function () { Router.navigate("patients/" + patient.id + "/tambah"); });
  }

  // ---------------- Tambah Data ----------------
  function tambahTemplate() {
    return (
      '<div class="card form-card">' +
        "<h2>Tambah Data Tensi</h2>" +
        '<form id="form-reading">' +
          '<label class="field"><span>Tanggal &amp; Waktu</span><input type="datetime-local" id="reading-datetime" required value="' + Utils.nowLocalInputValue() + '"></label>' +
          '<div class="field-row">' +
            '<label class="field"><span>Sistolik (mmHg)</span><input type="number" id="reading-systolic" min="60" max="260" placeholder="120" required></label>' +
            '<label class="field"><span>Diastolik (mmHg)</span><input type="number" id="reading-diastolic" min="40" max="160" placeholder="80" required></label>' +
          "</div>" +
          '<label class="field"><span>Nadi (bpm) <em>opsional</em></span><input type="number" id="reading-pulse" min="30" max="220" placeholder="72"></label>' +
          '<label class="field"><span>Catatan <em>opsional</em></span><textarea id="reading-note" rows="2" maxlength="200" placeholder="mis. setelah olahraga, sebelum minum obat"></textarea></label>' +
          '<div id="reading-preview" class="preview-badge hidden"><span>Kategori:</span><span class="badge" id="reading-preview-badge">-</span></div>' +
          '<p id="reading-error" class="field-error hidden"></p>' +
          '<div class="form-actions">' +
            '<button type="button" class="btn btn-ghost" id="btn-cancel-reading">Batal</button>' +
            '<button type="submit" class="btn btn-primary">Simpan Data</button>' +
          "</div>" +
        "</form>" +
      "</div>"
    );
  }

  function bindTambah(patient) {
    var sIn = document.getElementById("reading-systolic");
    var dIn = document.getElementById("reading-diastolic");
    function updatePreview() {
      var s = Number(sIn.value), d = Number(dIn.value);
      var wrap = document.getElementById("reading-preview");
      if (!s || !d) { wrap.classList.add("hidden"); return; }
      var cat = Utils.classifyBP(s, d);
      var badge = document.getElementById("reading-preview-badge");
      badge.textContent = cat.label;
      badge.className = "badge " + Utils.badgeClass(cat.key);
      wrap.classList.remove("hidden");
    }
    sIn.addEventListener("input", updatePreview);
    dIn.addEventListener("input", updatePreview);

    document.getElementById("btn-cancel-reading").addEventListener("click", function () {
      Router.navigate("patients/" + patient.id + "/riwayat");
    });

    document.getElementById("form-reading").addEventListener("submit", function (e) {
      e.preventDefault();
      var dt = document.getElementById("reading-datetime").value;
      var s = Number(sIn.value), d = Number(dIn.value);
      var pulse = document.getElementById("reading-pulse").value;
      var note = document.getElementById("reading-note").value.trim();
      var errEl = document.getElementById("reading-error");

      if (!dt || !s || !d) { errEl.textContent = "Tanggal, sistolik, dan diastolik wajib diisi."; errEl.classList.remove("hidden"); return; }
      if (s < 60 || s > 260 || d < 40 || d > 160) { errEl.textContent = "Nilai di luar rentang wajar. Periksa kembali."; errEl.classList.remove("hidden"); return; }
      if (d >= s) { errEl.textContent = "Diastolik harus lebih kecil dari sistolik."; errEl.classList.remove("hidden"); return; }
      errEl.classList.add("hidden");

      Store.addReading(patient.id, {
        date: new Date(dt).toISOString(),
        systolic: s, diastolic: d, pulse: pulse ? Number(pulse) : null, note: note || ""
      }).then(function () {
        Toast.show("Data tensi tersimpan");
        Router.navigate("patients/" + patient.id + "/riwayat");
      }).catch(function (err) { errEl.textContent = err.message; errEl.classList.remove("hidden"); });
    });
  }

  // ---------------- Statistik ----------------
  function statistikTemplate() {
    return (
      '<div class="range-bar">' +
        ["7", "30", "90", "all"].map(function (r) {
          var label = r === "all" ? "Semua" : r + " Hari";
          return '<button class="range-btn' + (r === statsRange ? " active" : "") + '" data-range="' + r + '">' + label + "</button>";
        }).join("") +
      "</div>" +
      '<div id="stats-body"></div>'
    );
  }

  function bindStatistik(patient, allReadings) {
    document.querySelectorAll(".range-bar .range-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        statsRange = btn.getAttribute("data-range");
        document.querySelectorAll(".range-bar .range-btn").forEach(function (b) { b.classList.toggle("active", b === btn); });
        renderStatsBody(allReadings);
      });
    });
    renderStatsBody(allReadings);
  }

  function renderStatsBody(all) {
    var entries;
    if (statsRange === "all") entries = all;
    else {
      var cutoff = Date.now() - Number(statsRange) * 24 * 3600 * 1000;
      entries = all.filter(function (e) { return new Date(e.date).getTime() >= cutoff; });
    }
    entries = entries.slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

    var body = document.getElementById("stats-body");
    if (entries.length === 0) {
      body.innerHTML = '<div class="card"><div class="empty-state"><p>Belum ada data untuk rentang ini.</p></div></div>';
      return;
    }

    var systolics = entries.map(function (e) { return e.systolic; });
    var diastolics = entries.map(function (e) { return e.diastolic; });
    var pulses = entries.filter(function (e) { return e.pulse; }).map(function (e) { return e.pulse; });
    var dist = Charts.distribution(entries);

    body.innerHTML =
      '<div class="summary-grid stats-summary-grid">' +
        '<div class="card stat-mini"><span class="card-label">Rata-rata</span><span class="card-value">' + Math.round(Utils.avg(systolics)) + "/" + Math.round(Utils.avg(diastolics)) + "</span></div>" +
        '<div class="card stat-mini"><span class="card-label">Tertinggi</span><span class="card-value">' + Math.max.apply(null, systolics) + "/" + Math.max.apply(null, diastolics) + "</span></div>" +
        '<div class="card stat-mini"><span class="card-label">Terendah</span><span class="card-value">' + Math.min.apply(null, systolics) + "/" + Math.min.apply(null, diastolics) + "</span></div>" +
        '<div class="card stat-mini"><span class="card-label">Nadi Rata-rata</span><span class="card-value">' + (pulses.length ? Math.round(Utils.avg(pulses)) + " bpm" : "-") + "</span></div>" +
      "</div>" +
      '<div class="card chart-card">' +
        "<h2>Tren Tekanan Darah</h2>" +
        '<div class="chart-legend"><span><i class="dot dot-systolic"></i>Sistolik</span><span><i class="dot dot-diastolic"></i>Diastolik</span></div>' +
        '<div class="chart-svg-wrap">' + Charts.lineChartSvg(entries) + "</div>" +
      "</div>" +
      '<div class="card chart-card">' +
        "<h2>Distribusi Kategori</h2>" +
        '<div class="distribution-bar">' + dist.barHtml + "</div>" +
        '<div class="distribution-legend">' + dist.legendHtml + "</div>" +
      "</div>";
  }

  return { render: render };
})();
