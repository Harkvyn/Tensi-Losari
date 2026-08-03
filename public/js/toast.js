var Toast = (function () {
  "use strict";
  var el, timer;

  function show(msg) {
    if (!el) el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(timer);
    timer = setTimeout(function () { el.classList.add("hidden"); }, 2200);
  }

  return { show: show };
})();
