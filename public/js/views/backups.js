/* Lets petugas see and download the automatic daily backups, so at least
   one copy regularly ends up off the server too. */
var BackupsView = (function () {
  "use strict";

  function render() {
    var root = document.getElementById("view-root");
    root.innerHTML = template();
    bind();
    load();
  }

  function template() {
    return (
      '<section class="view">' +
        '<div class="card">' +
          '<div class="list-card-head">' +
            "<h2>Backup Data</h2>" +
            '<button class="btn btn-primary btn-sm" id="btn-backup-now">+ Buat Backup Sekarang</button>' +
          "</div>" +
          '<p class="profile-header-note">Backup otomatis dibuat tiap hari di server. Unduh salinannya secara berkala ke laptop/HP kamu sendiri - jangan cuma mengandalkan salinan yang ada di server.</p>' +
          '<div id="backup-list" class="entry-list"></div>' +
        "</div>" +
      "</section>"
    );
  }

  function bind() {
    document.getElementById("btn-backup-now").addEventListener("click", function (e) {
      e.target.disabled = true;
      Store.createBackupNow().then(function () {
        Toast.show("Backup baru dibuat");
        load();
      }).catch(function (err) { Toast.show(err.message); }).then(function () { e.target.disabled = false; });
    });
  }

  function load() {
    var listEl = document.getElementById("backup-list");
    listEl.innerHTML = '<div class="empty-state"><p>Memuat...</p></div>';
    Store.getBackups().then(function (backups) {
      if (backups.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><p>Belum ada backup.</p></div>';
        return;
      }
      listEl.innerHTML = backups.map(renderRow).join("");
    }).catch(function (err) {
      listEl.innerHTML = '<div class="empty-state"><p>' + Utils.escapeHtml(err.message) + "</p></div>";
    });
  }

  function renderRow(b) {
    var sizeKb = Math.round(b.sizeBytes / 1024);
    return (
      '<div class="entry-row">' +
        '<div class="entry-main">' +
          '<span class="entry-values">' + Utils.fmtDateTime(b.createdAt) + "</span>" +
        "</div>" +
        '<div class="entry-meta"><span class="entry-date">' + sizeKb + " KB</span></div>" +
        '<a class="btn btn-ghost btn-sm" href="' + Store.backupDownloadUrl(b.filename) + '" download>Unduh</a>' +
      "</div>"
    );
  }

  return { render: render };
})();
