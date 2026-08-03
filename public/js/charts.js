/* Pure render functions: readings in, HTML/SVG string out. No DOM lookups here. */
var Charts = (function () {
  "use strict";

  function lineChartSvg(entries) {
    var w = 640, h = 260, padL = 34, padR = 12, padT = 16, padB = 28;
    var innerW = w - padL - padR, innerH = h - padT - padB;

    var allVals = entries.map(function (e) { return e.systolic; }).concat(entries.map(function (e) { return e.diastolic; }));
    var maxV = Math.max.apply(null, allVals) + 10;
    var minV = Math.min.apply(null, allVals) - 10;
    var range = Math.max(maxV - minV, 1);

    var n = entries.length;
    function x(i) { return n === 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW; }
    function y(v) { return padT + innerH - ((v - minV) / range) * innerH; }

    function pathFor(key) {
      return entries.map(function (e, i) { return (i === 0 ? "M" : "L") + x(i).toFixed(1) + "," + y(e[key]).toFixed(1); }).join(" ");
    }

    var gridLines = "";
    var steps = 4;
    for (var i = 0; i <= steps; i++) {
      var v = minV + (range / steps) * i;
      var yy = y(v);
      gridLines += '<line x1="' + padL + '" y1="' + yy.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + yy.toFixed(1) + '" stroke="#eef0f2" stroke-width="1"/>';
      gridLines += '<text x="4" y="' + (yy + 4).toFixed(1) + '" font-size="10" fill="#9ca3af">' + Math.round(v) + "</text>";
    }

    var xLabels = "";
    var labelCount = Math.min(n, 6);
    for (var li = 0; li < labelCount; li++) {
      var idx = Math.round((li / Math.max(labelCount - 1, 1)) * (n - 1));
      xLabels += '<text x="' + x(idx).toFixed(1) + '" y="' + (h - 8) + '" font-size="10" fill="#9ca3af" text-anchor="middle">' + Utils.fmtDateShort(entries[idx].date) + "</text>";
    }

    function dots(key, color) {
      return entries.map(function (e, i) {
        return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(e[key]).toFixed(1) + '" r="3" fill="' + color + '" stroke="#fff" stroke-width="1"/>';
      }).join("");
    }

    return (
      '<svg viewBox="0 0 ' + w + " " + h + '" xmlns="http://www.w3.org/2000/svg">' +
        gridLines +
        '<path d="' + pathFor("systolic") + '" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<path d="' + pathFor("diastolic") + '" fill="none" stroke="#0891b2" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +
        dots("systolic", "#2563eb") +
        dots("diastolic", "#0891b2") +
        xLabels +
      "</svg>"
    );
  }

  function distribution(entries) {
    var counts = {};
    Utils.CATEGORIES.forEach(function (c) { counts[c.key] = 0; });
    entries.forEach(function (e) { counts[Utils.classifyBP(e.systolic, e.diastolic).key]++; });

    var total = entries.length;
    var barHtml = "", legendHtml = "";
    Utils.CATEGORIES.slice().reverse().forEach(function (cat) {
      var count = counts[cat.key];
      if (count === 0) return;
      var pct = (count / total) * 100;
      barHtml += '<div class="seg" style="width:' + pct.toFixed(1) + '%;background:' + cat.color + '" title="' + cat.label + ": " + count + '"></div>';
      legendHtml += '<span><i class="dot" style="background:' + cat.color + '"></i>' + cat.label + " — " + count + " (" + Math.round(pct) + "%)</span>";
    });
    return { barHtml: barHtml, legendHtml: legendHtml };
  }

  return { lineChartSvg: lineChartSvg, distribution: distribution };
})();
