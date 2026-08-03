/* Staff (petugas) login / registration. Runs outside the router - it
   gates access to everything the router serves. Session lives server-side
   (httpOnly cookie); this module just reflects that state in the UI. */
var AuthView = (function () {
  "use strict";

  var elAuth, elShell, formLogin, formRegister;
  var onLoggedIn;

  function init(options) {
    onLoggedIn = options.onLoggedIn;
    elAuth = document.getElementById("view-auth");
    elShell = document.getElementById("view-shell");
    formLogin = document.getElementById("form-login");
    formRegister = document.getElementById("form-register");

    document.querySelectorAll(".auth-tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { switchTab(btn.getAttribute("data-authtab")); });
    });

    formLogin.addEventListener("submit", handleLogin);
    formRegister.addEventListener("submit", handleRegister);
    document.getElementById("btn-logout").addEventListener("click", handleLogout);

    loadPosyanduOptions();
  }

  function loadPosyanduOptions() {
    var select = document.getElementById("register-posyandu");
    Store.getPosyanduList().then(function (list) {
      select.innerHTML = '<option value="" disabled selected>Pilih posyandu</option>' +
        list.map(function (p) { return '<option value="' + p.id + '">' + Utils.escapeHtml(p.name) + "</option>"; }).join("");
    }).catch(function () {
      select.innerHTML = '<option value="" disabled selected>Gagal memuat daftar posyandu</option>';
    });
  }

  function switchTab(tab) {
    document.querySelectorAll(".auth-tab-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-authtab") === tab);
    });
    formLogin.classList.toggle("hidden", tab !== "login");
    formRegister.classList.toggle("hidden", tab !== "register");
  }

  function handleLogin(e) {
    e.preventDefault();
    var errEl = document.getElementById("login-error");
    errEl.classList.add("hidden");
    Store.login({
      username: document.getElementById("login-username").value.trim(),
      password: document.getElementById("login-password").value
    }).then(function (petugas) {
      formLogin.reset();
      enterApp(petugas);
    }).catch(function (err) { showError(errEl, err.message); });
  }

  function handleRegister(e) {
    e.preventDefault();
    var errEl = document.getElementById("register-error");
    var password = document.getElementById("register-password").value;
    var password2 = document.getElementById("register-password2").value;
    if (password !== password2) return showError(errEl, "Konfirmasi password tidak cocok.");
    errEl.classList.add("hidden");

    Store.register({
      inviteCode: document.getElementById("register-invite").value.trim(),
      name: document.getElementById("register-name").value.trim(),
      posyanduId: document.getElementById("register-posyandu").value,
      username: document.getElementById("register-username").value.trim(),
      password: password
    }).then(function (petugas) {
      formRegister.reset();
      enterApp(petugas);
    }).catch(function (err) { showError(errEl, err.message); });
  }

  function handleLogout() {
    Store.logout().catch(function () {}).then(function () {
      elShell.classList.add("hidden");
      elAuth.classList.remove("hidden");
      switchTab("login");
    });
  }

  function showError(el, msg) { el.textContent = msg; el.classList.remove("hidden"); }

  function showTopbar(petugas) {
    document.getElementById("topbar-username").textContent = "Halo, " + petugas.name + " · " + petugas.posyanduName;
  }

  function enterApp(petugas) {
    showTopbar(petugas);
    elAuth.classList.add("hidden");
    elShell.classList.remove("hidden");
    onLoggedIn();
  }

  function boot() {
    Store.me().then(function (petugas) {
      showTopbar(petugas);
      elAuth.classList.add("hidden");
      elShell.classList.remove("hidden");
      onLoggedIn();
    }).catch(function () {
      elShell.classList.add("hidden");
      elAuth.classList.remove("hidden");
    });
  }

  return { init: init, boot: boot };
})();
