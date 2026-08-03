/* Add / edit patient. Same template for both - editId is null on create. */
var PatientFormView = (function () {
  "use strict";

  var editId = null;

  function render(params) {
    editId = params.id || null;
    var root = document.getElementById("view-root");

    if (!editId) {
      root.innerHTML = template(null);
      bind(null);
      return;
    }

    root.innerHTML = '<div class="card"><div class="empty-state"><p>Memuat data pasien...</p></div></div>';
    Store.getPatient(editId).then(function (existing) {
      root.innerHTML = template(existing);
      bind(existing);
    }).catch(function () { Router.navigate("dashboard"); });
  }

  function template(p) {
    p = p || {};
    return (
      '<section class="view">' +
        '<div class="card form-card">' +
          '<h2>' + (p.id ? "Edit Data Pasien" : "Tambah Pasien Baru") + "</h2>" +
          '<form id="form-patient">' +
            '<label class="field"><span>Nama Lengkap</span>' +
              '<input type="text" id="patient-name" required maxlength="60" value="' + Utils.escapeHtml(p.name || "") + '" placeholder="Nama pasien"></label>' +

            '<div class="field-row">' +
              '<label class="field"><span>Tanggal Lahir</span>' +
                '<input type="date" id="patient-birthdate" required value="' + (p.birthDate || "") + '"></label>' +
              '<label class="field"><span>Umur</span>' +
                '<input type="text" id="patient-age" disabled placeholder="-"></label>' +
            "</div>" +

            '<div class="field-row">' +
              '<label class="field"><span>Jenis Kelamin</span>' +
                '<select id="patient-gender">' +
                  '<option value="L"' + (p.gender === "L" ? " selected" : "") + ">Laki-laki</option>" +
                  '<option value="P"' + (p.gender === "P" ? " selected" : "") + ">Perempuan</option>" +
                "</select></label>" +
              '<label class="field"><span>No. Telepon <em>opsional</em></span>' +
                '<input type="tel" id="patient-phone" maxlength="20" value="' + Utils.escapeHtml(p.phone || "") + '" placeholder="08xx-xxxx-xxxx"></label>' +
            "</div>" +

            '<label class="field"><span>Catatan <em>opsional</em></span>' +
              '<textarea id="patient-note" rows="2" maxlength="200" placeholder="riwayat penyakit, alergi, dll">' + Utils.escapeHtml(p.note || "") + "</textarea></label>" +

            '<p id="patient-error" class="field-error hidden"></p>' +

            '<div class="form-actions">' +
              '<button type="button" class="btn btn-ghost" id="btn-cancel-patient">Batal</button>' +
              '<button type="submit" class="btn btn-primary">' + (p.id ? "Simpan Perubahan" : "Simpan Pasien") + "</button>" +
            "</div>" +
          "</form>" +
        "</div>" +
      "</section>"
    );
  }

  function bind(existing) {
    var birthInput = document.getElementById("patient-birthdate");
    var ageInput = document.getElementById("patient-age");
    function updateAge() {
      var age = Utils.ageFromBirthDate(birthInput.value);
      ageInput.value = age !== null ? age + " tahun" : "";
    }
    birthInput.addEventListener("input", updateAge);
    updateAge();

    document.getElementById("btn-cancel-patient").addEventListener("click", function () {
      Router.navigate(existing ? "patients/" + existing.id : "dashboard");
    });

    document.getElementById("form-patient").addEventListener("submit", function (e) {
      e.preventDefault();
      submit(existing);
    });
  }

  function submit(existing) {
    var name = document.getElementById("patient-name").value.trim();
    var birthDate = document.getElementById("patient-birthdate").value;
    var gender = document.getElementById("patient-gender").value;
    var phone = document.getElementById("patient-phone").value.trim();
    var note = document.getElementById("patient-note").value.trim();
    var errEl = document.getElementById("patient-error");

    if (!name || !birthDate) {
      errEl.textContent = "Nama dan tanggal lahir wajib diisi.";
      errEl.classList.remove("hidden");
      return;
    }
    if (new Date(birthDate) > new Date()) {
      errEl.textContent = "Tanggal lahir tidak boleh di masa depan.";
      errEl.classList.remove("hidden");
      return;
    }
    errEl.classList.add("hidden");
    var payload = { name: name, birthDate: birthDate, gender: gender, phone: phone, note: note };

    if (existing) {
      Store.updatePatient(existing.id, payload).then(function () {
        Toast.show("Data pasien diperbarui");
        Router.navigate("patients/" + existing.id);
      }).catch(function (err) { errEl.textContent = err.message; errEl.classList.remove("hidden"); });
    } else {
      Store.addPatient(payload).then(function (patient) {
        Toast.show("Pasien baru ditambahkan");
        Router.navigate("patients/" + patient.id);
      }).catch(function (err) { errEl.textContent = err.message; errEl.classList.remove("hidden"); });
    }
  }

  return { render: render };
})();
