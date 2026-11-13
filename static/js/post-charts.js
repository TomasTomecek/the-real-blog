// Horizontal bar charts for blog posts, no dependencies.
//
// A post embeds a chart as a figure with its data as JSON:
//
//   <figure class="post-chart">
//   <script type="application/json">
//   {"title": "...", "rows": ["a", "b"],
//    "panels": [{"title": "...", "max": 10, "series": [{"values": [1, 2]}]}]}
//   </script>
//   </figure>
//
// and loads this file once, at its end. Spec:
//
//   title, note     text above and below the chart
//   rows            row labels, top to bottom
//   emphasis        optional row indexes drawn in the series colour;
//                   the other rows are drawn in gray
//   panels          one or more panels side by side, sharing the rows
//     title         what the panel measures
//     min, max      scale (min defaults to 0)
//     ticks         tick values (default: min and max)
//     prefix, suffix, decimals   number format
//     tickDecimals  decimals of the tick labels (default: decimals)
//     series        one or more bars per row
//       name        legend label (needed with two or more series)
//       values      one number per row, null for no bar
//       labels      optional text per row instead of the formatted value
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var RAMP = { 1: ["#2a78d6"], 2: ["#86b6ef", "#256abf"], 3: ["#86b6ef", "#2a78d6", "#104281"] };
  var GRAY = "#a3a29b";
  var CSS =
    ".post-chart{margin:2em 0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;" +
    "color:#0b0b0b;position:relative}" +
    ".post-chart p{font-family:inherit}" +
    ".post-chart .pc-title{font-size:15px;font-weight:600;margin:0 0 4px}" +
    ".post-chart .pc-legend{font-size:12px;color:#52514e;margin:0 0 4px}" +
    ".post-chart .pc-legend span{margin-right:14px;white-space:nowrap}" +
    ".post-chart .pc-legend i{display:inline-block;width:10px;height:10px;border-radius:2px;" +
    "margin-right:5px;vertical-align:-1px}" +
    ".post-chart .pc-note{font-size:12px;color:#52514e;margin:4px 0 0;line-height:1.4}" +
    ".post-chart svg{display:block;max-width:100%;overflow:visible}" +
    ".post-chart svg text{font-family:inherit}" +
    ".post-chart .pc-hit{fill:transparent;outline:none}" +
    ".post-chart .pc-hit:hover,.post-chart .pc-hit:focus{fill:rgba(11,11,11,0.05)}" +
    ".post-chart .pc-tip{position:absolute;pointer-events:none;background:#fff;color:#0b0b0b;" +
    "border:1px solid rgba(11,11,11,0.15);border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.12);" +
    "padding:6px 9px;font-size:12px;line-height:1.5;z-index:5;white-space:nowrap;display:none}" +
    ".post-chart .pc-tip b{display:block}" +
    ".post-chart .pc-tip i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px}";

  function el(name, attrs, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  function html(name, cls, text) {
    var e = document.createElement(name);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function fmt(panel, v) {
    var d = panel.decimals || 0;
    return (panel.prefix || "") + v.toFixed(d) + (panel.suffix || "");
  }

  function valueLabel(panel, series, i) {
    var v = series.values[i];
    if (v == null) return null;
    return series.labels && series.labels[i] != null ? series.labels[i] : fmt(panel, v);
  }

  function colors(panel) {
    return RAMP[Math.min(panel.series.length, 3)];
  }

  // Width of the widest of some strings at a font size, measured in the page.
  function textWidth(svg, strings, size, weight) {
    var w = 0;
    strings.forEach(function (s) {
      var t = el("text", { "font-size": size, "font-weight": weight || 400 }, s);
      svg.appendChild(t);
      w = Math.max(w, t.getComputedTextLength());
      svg.removeChild(t);
    });
    return Math.ceil(w);
  }

  // A bar from x to x + w: square at the baseline, 4px rounded at the data end.
  function barPath(x, y, w, h) {
    var r = Math.min(4, w, h / 2);
    return (
      "M" + x + "," + y + "h" + (w - r) + "a" + r + "," + r + " 0 0 1 " + r + "," + r +
      "v" + (h - 2 * r) + "a" + r + "," + r + " 0 0 1 " + -r + "," + r + "h" + -(w - r) + "z"
    );
  }

  function draw(fig, spec) {
    var old = fig.querySelector(".pc-body");
    if (old) fig.removeChild(old);
    var body = html("div", "pc-body");
    fig.appendChild(body);

    if (spec.title) body.appendChild(html("p", "pc-title", spec.title));

    var named = spec.panels[0].series.filter(function (s) { return s.name; });
    if (named.length > 1) {
      var legend = html("p", "pc-legend");
      named.forEach(function (s, k) {
        var item = html("span");
        var sw = html("i");
        sw.style.background = colors(spec.panels[0])[k];
        item.appendChild(sw);
        item.appendChild(document.createTextNode(s.name));
        legend.appendChild(item);
      });
      body.appendChild(legend);
    }

    var width = Math.max(280, Math.floor(body.clientWidth || fig.clientWidth || 640));
    var svg = el("svg", { width: width, role: "img", "aria-label": spec.title || "chart" });
    body.appendChild(svg);

    var FONT = 12;
    var nSeries = spec.panels[0].series.length;
    var barH = nSeries > 1 ? 10 : 14;
    var rowH = nSeries * barH + (nSeries - 1) * 2 + 12;
    var gap = 28;
    var labelW = textWidth(svg, spec.rows, FONT) + 16;
    // On a narrow page the row labels go above the bars and the panels stack.
    var narrow = width < 520 || labelW > width * 0.42;
    var stacked = narrow && spec.panels.length > 1;
    if (narrow) { labelW = 0; rowH += 16; }
    var cols = stacked ? 1 : spec.panels.length;
    var panelW = Math.floor((width - labelW - gap * (cols - 1)) / cols);
    var headH = 22;
    var axisH = 20;
    var plotH = spec.rows.length * rowH;
    var blockH = headH + plotH + axisH;
    var height = stacked ? spec.panels.length * (blockH + 14) - 14 : blockH;
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);

    var tip = html("div", "pc-tip");
    body.appendChild(tip);

    function showTip(i, evt, target) {
      tip.textContent = "";
      tip.appendChild(html("b", null, spec.rows[i]));
      spec.panels.forEach(function (p) {
        p.series.forEach(function (s, k) {
          var label = valueLabel(p, s, i);
          if (label == null) return;
          var line = html("div");
          var sw = html("i");
          sw.style.background = barColor(p, k, i);
          line.appendChild(sw);
          var what = p.title + (s.name ? ", " + s.name : "");
          line.appendChild(document.createTextNode(what + ": " + label));
          tip.appendChild(line);
        });
      });
      tip.style.display = "block";
      var box = fig.getBoundingClientRect();
      var x, y;
      if (evt && evt.clientX != null) {
        x = evt.clientX - box.left + 14;
        y = evt.clientY - box.top + 14;
      } else {
        var r = target.getBoundingClientRect();
        x = r.left - box.left + 20;
        y = r.bottom - box.top + 4;
      }
      x = Math.max(0, Math.min(x, box.width - tip.offsetWidth - 2));
      tip.style.left = x + "px";
      tip.style.top = y + "px";
    }

    function hideTip() { tip.style.display = "none"; }

    function barColor(panel, k, i) {
      if (spec.emphasis && spec.emphasis.indexOf(i) < 0) return GRAY;
      return colors(panel)[k];
    }

    spec.panels.forEach(function (panel, pi) {
      var x0 = labelW + (stacked ? 0 : pi * (panelW + gap));
      var y0 = stacked ? pi * (blockH + 14) : 0;
      var min = panel.min || 0;
      var tipLabels = [];
      panel.series.forEach(function (s) {
        spec.rows.forEach(function (_, i) {
          var l = valueLabel(panel, s, i);
          if (l != null) tipLabels.push(l);
        });
      });
      // Leave room after the longest bar for its value label.
      var plotW = panelW - textWidth(svg, tipLabels, FONT) - 8;
      var scale = function (v) { return ((v - min) / (panel.max - min)) * plotW; };

      svg.appendChild(el("text", {
        x: x0, y: y0 + 13, "font-size": FONT, "font-weight": 600, fill: "#0b0b0b"
      }, panel.title));

      var top = y0 + headH;
      (panel.ticks || [min, panel.max]).forEach(function (t) {
        var x = x0 + Math.round(scale(t)) + 0.5;
        var base = t === min;
        svg.appendChild(el("line", {
          x1: x, x2: x, y1: top, y2: top + plotH, stroke: base ? "#c3c2b7" : "#e1e0d9", "stroke-width": 1
        }));
        svg.appendChild(el("text", {
          x: x, y: top + plotH + 14, "font-size": 11, fill: "#898781",
          "text-anchor": base ? "start" : "middle"
        }, fmt(panel.tickDecimals == null ? panel : { prefix: panel.prefix, suffix: panel.suffix, decimals: panel.tickDecimals }, t)));
      });

      spec.rows.forEach(function (row, i) {
        var ry = top + i * rowH;
        var by = ry + (narrow ? 20 : 6);
        if (narrow || pi === 0) {
          svg.appendChild(el("text", narrow
            ? { x: x0, y: ry + 14, "font-size": FONT, fill: "#52514e" }
            : { x: labelW - 12, y: ry + rowH / 2 + 4, "font-size": FONT, fill: "#52514e", "text-anchor": "end" },
          row));
        }
        panel.series.forEach(function (s, k) {
          var v = s.values[i];
          if (v == null) return;
          var w = Math.max(2, scale(v));
          var y = by + k * (barH + 2);
          svg.appendChild(el("path", { d: barPath(x0, y, w, barH), fill: barColor(panel, k, i) }));
          svg.appendChild(el("text", {
            x: x0 + w + 6, y: y + barH / 2 + 4, "font-size": nSeries > 1 ? 11 : FONT, fill: "#0b0b0b"
          }, valueLabel(panel, s, i)));
        });
      });
    });

    // One hover and focus target per row, across all panels.
    if (!stacked) {
      spec.rows.forEach(function (row, i) {
        var hit = el("rect", {
          x: 0, y: headH + i * rowH, width: width, height: rowH,
          "class": "pc-hit", tabindex: 0, "aria-label": row
        });
        hit.addEventListener("mousemove", function (e) { showTip(i, e, hit); });
        hit.addEventListener("mouseleave", hideTip);
        hit.addEventListener("focus", function () { showTip(i, null, hit); });
        hit.addEventListener("blur", hideTip);
        svg.appendChild(hit);
      });
    }

    if (spec.note) body.appendChild(html("p", "pc-note", spec.note));
  }

  function init() {
    var figs = Array.prototype.slice.call(document.querySelectorAll("figure.post-chart"));
    if (!figs.length) return;
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    var charts = [];
    figs.forEach(function (fig) {
      var data = fig.querySelector('script[type="application/json"]');
      if (!data) return;
      try {
        charts.push({ fig: fig, spec: JSON.parse(data.textContent), width: 0 });
      } catch (e) {
        if (window.console) console.error("post-chart: bad JSON", e);
      }
    });

    function drawAll() {
      charts.forEach(function (c) {
        var w = c.fig.clientWidth;
        if (w === c.width) return;
        c.width = w;
        draw(c.fig, c.spec);
      });
    }
    drawAll();
    var timer;
    window.addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(drawAll, 150);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
