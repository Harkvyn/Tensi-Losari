/* Wires routes to views and boots the app. Add a new page by adding one
   Router.register call here and one file under js/views/. */
(function () {
  "use strict";

  Router.register(function (segs) { return segs.length === 0 || segs[0] === "dashboard" ? {} : null; }, DashboardView.render);
  Router.register(function (segs) { return segs[0] === "patients" && segs[1] === "new" ? {} : null; }, PatientFormView.render);
  Router.register(function (segs) { return segs[0] === "patients" && segs[1] && segs[2] === "edit" ? { id: segs[1] } : null; }, PatientFormView.render);
  Router.register(function (segs) { return segs[0] === "patients" && segs[1] ? { id: segs[1], tab: segs[2] } : null; }, PatientProfileView.render);
  Router.register(function (segs) { return segs[0] === "backups" ? {} : null; }, BackupsView.render);
  Router.setNotFound(function () { Router.navigate("dashboard"); });

  document.getElementById("btn-goto-backups").addEventListener("click", function () { Router.navigate("backups"); });

  AuthView.init({ onLoggedIn: Router.resolve });
  AuthView.boot();
})();
