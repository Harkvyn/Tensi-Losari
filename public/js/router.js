/*
 * Minimal hash router. Routes are matched in registration order; the first
 * matcher that returns a params object (truthy) wins. Adding a new page
 * later is just one more Router.register call - no other file changes.
 */
var Router = (function () {
  "use strict";

  var routes = [];
  var notFound = null;

  function register(matcher, render) { routes.push({ matcher: matcher, render: render }); }
  function setNotFound(render) { notFound = render; }

  function segments() {
    var hash = window.location.hash.replace(/^#\/?/, "");
    return hash ? hash.split("/").filter(Boolean) : [];
  }

  function resolve() {
    var segs = segments();
    for (var i = 0; i < routes.length; i++) {
      var params = routes[i].matcher(segs);
      if (params) { routes[i].render(params); return; }
    }
    if (notFound) notFound();
  }

  function navigate(path) {
    if (window.location.hash === "#/" + path) { resolve(); return; }
    window.location.hash = "/" + path;
  }

  window.addEventListener("hashchange", resolve);

  return { register: register, setNotFound: setNotFound, resolve: resolve, navigate: navigate };
})();
