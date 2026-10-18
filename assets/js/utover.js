(function () {
  var mount = document.getElementById("utover-chart");
  var readout = document.getElementById("utover-readout");
  var filters = document.getElementById("utover-filters");
  var raw = document.getElementById("utover-data");
  if (!mount || !raw) return;

  var person;
  try {
    person = JSON.parse(raw.textContent);
  } catch (err) {
    return;
  }

  var years = (person.akse_aar || []).map(Number);
  var results = person.results || [];
  if (!years.length) {
    results.forEach(function (row) {
      if (years.indexOf(row.year) === -1) years.push(row.year);
    });
    years.sort();
  }

  var disciplineOrder = ["loping", "landevei", "gravel", "rulleski"];
  var disciplines = [];
  function addDiscipline(id, tittel) {
    if (disciplines.some(function (item) { return item.id === id; })) return;
    disciplines.push({ id: id, tittel: tittel || id });
  }
  disciplineOrder.forEach(function (id) {
    var row = results.find(function (item) { return item.disiplin_id === id; });
    if (row) addDiscipline(id, row.disiplin);
  });
  results.forEach(function (row) {
    addDiscipline(row.disiplin_id, row.disiplin);
  });

  var activeId = disciplines[0] && disciplines[0].id;
  if (disciplines.some(function (item) { return item.id === "loping"; })) {
    activeId = "loping";
  }
  var hashId = (location.hash || "").replace(/^#/, "");
  if (hashId && disciplines.some(function (item) { return item.id === hashId; })) {
    activeId = hashId;
  }

  var w = 1000;
  var h = 320;
  var padL = 78;
  var padR = 40;
  var padT = 36;
  var padB = 58;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hoverTargets = [];

  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "utover-svg");
  svg.setAttribute("viewBox", "0 0 " + w + " " + h);
  svg.setAttribute("role", "presentation");
  mount.appendChild(svg);

  function xOf(year) {
    var innerL = padL + 22;
    var innerR = w - padR - 22;
    if (years.length === 1) return (innerL + innerR) / 2;
    var i = years.indexOf(year);
    if (i < 0) i = 0;
    return innerL + (i / (years.length - 1)) * (innerR - innerL);
  }

  function yOf(seconds, minS, maxS) {
    return padT + (1 - (maxS - seconds) / (maxS - minS)) * (h - padT - padB);
  }

  function formatTid(seconds) {
    var s = Math.round(seconds);
    var hh = Math.floor(s / 3600);
    var mm = Math.floor((s % 3600) / 60);
    var ss = s % 60;
    if (hh > 0) {
      return hh + ":" + String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
    }
    return mm + ":" + String(ss).padStart(2, "0");
  }

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setReadout(text) {
    if (readout) readout.textContent = text;
  }

  function hoverLine() {
    return svg.querySelector("#utover-hover");
  }

  function draw(disiplinId) {
    activeId = disiplinId;
    var discipline = disciplines.find(function (item) { return item.id === disiplinId; }) || disciplines[0];
    var chartRows = results.filter(function (row) {
      return row.disiplin_id === discipline.id;
    });
    var plottable = chartRows.filter(function (row) {
      return typeof row.seconds === "number";
    });
    var primaryName = ((plottable[0] || chartRows[0] || {}).disiplin) || "tider";

    function defaultReadout() {
      return plottable.length
        ? "Grafen viser " + primaryName.toLowerCase() + ". Raskere tid ligger høyere."
        : "Ingen plotbare tider ennå.";
    }

    mount.setAttribute("aria-label", "Graf over " + primaryName.toLowerCase() + " for " + (person.navn || ""));

    if (filters) {
      Array.prototype.forEach.call(filters.querySelectorAll(".utover-filter"), function (btn) {
        var on = btn.getAttribute("data-id") === discipline.id;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }

    if (!plottable.length) {
      hoverTargets = [];
      svg.innerHTML =
        '<text x="' + w / 2 + '" y="' + h / 2 + '" text-anchor="middle" fill="#5a564c" font-size="22" font-family="Oswald, sans-serif" font-style="italic" font-weight="700">Ingen tider å tegne ennå</text>';
      setReadout(defaultReadout());
      return;
    }

    var rawMin = Math.min.apply(null, plottable.map(function (row) { return row.seconds; }));
    var rawMax = Math.max.apply(null, plottable.map(function (row) { return row.seconds; }));
    var pad = Math.max(90, (rawMax - rawMin) * 0.22);
    if (rawMin === rawMax) pad = 360;
    var minS = Math.max(0, rawMin - pad);
    var maxS = rawMax + pad;
    var span = maxS - minS;
    var step = 300;
    if (span <= 600) step = 120;
    else if (span <= 1200) step = 180;
    else if (span <= 2400) step = 300;
    else step = 600;
    minS = Math.floor(minS / step) * step;
    maxS = Math.ceil(maxS / step) * step;
    if (minS === maxS) maxS = minS + step * 2;

    var grid = "";
    for (var value = minS; value <= maxS + 0.01; value += step) {
      var gy = yOf(value, minS, maxS);
      grid +=
        '<line x1="' + padL + '" y1="' + gy + '" x2="' + (w - padR) + '" y2="' + gy + '" stroke="#111111" stroke-opacity="0.12" stroke-width="1"/>' +
        '<text x="' + (padL - 12) + '" y="' + (gy + 5) + '" text-anchor="end" fill="#111111" font-size="16" font-family="Oswald, sans-serif" font-style="italic" font-weight="700">' +
        escapeXml(formatTid(value)) +
        "</text>";
    }

    var dnfByYear = {};
    chartRows.forEach(function (row) {
      if (typeof row.seconds === "number") return;
      if (!String(row.tid).match(/DNF|Ukjent|Uvisst/i)) return;
      dnfByYear[row.year] = row;
    });

    hoverTargets = [];
    var axis = "";
    years.forEach(function (year) {
      var tx = xOf(year);
      var dnf = dnfByYear[year];
      axis +=
        '<line x1="' + tx + '" y1="' + (h - padB) + '" x2="' + tx + '" y2="' + (h - padB + 7) + '" stroke="#111111" stroke-width="1.4"/>' +
        '<text x="' + tx + '" y="' + (dnf ? h - 22 : h - 14) + '" text-anchor="middle" fill="#111111" font-size="16" font-family="Barlow Condensed, sans-serif" font-weight="700" letter-spacing="1.4">' +
        year +
        "</text>";
      if (dnf) {
        var dnfLabel = dnf.tid.indexOf("DNF") !== -1 ? "DNF" : dnf.tid;
        axis +=
          '<text x="' + tx + '" y="' + (h - 6) + '" text-anchor="middle" fill="#5a564c" font-size="12" font-family="Barlow Condensed, sans-serif" font-weight="700" letter-spacing="1.2">' +
          escapeXml(dnfLabel) +
          "</text>";
        hoverTargets.push({ x: tx, y: h - padB, row: dnf });
      }
    });

    var points = plottable
      .sort(function (a, b) { return a.year - b.year; })
      .map(function (row) {
        return {
          row: row,
          x: xOf(row.year),
          y: yOf(row.seconds, minS, maxS)
        };
      });

    var paths = "";
    if (points.length > 1) {
      var area =
        "M" + points[0].x.toFixed(1) + " " + (h - padB) +
        points.map(function (p) {
          return " L" + p.x.toFixed(1) + " " + p.y.toFixed(1);
        }).join("") +
        " L" + points[points.length - 1].x.toFixed(1) + " " + (h - padB) +
        " Z";
      paths += '<path d="' + area + '" fill="rgba(255, 210, 0, 0.28)"></path>';
    }

    var line = points.map(function (p, i) {
      return (i === 0 ? "M" : "L") + p.x.toFixed(1) + " " + p.y.toFixed(1);
    }).join(" ");
    paths +=
      '<path class="utover-line" d="' + line + '" fill="none" stroke="#111111" stroke-width="3.2" stroke-linejoin="miter" stroke-linecap="square"></path>';

    if (points.length === 1) {
      paths +=
        '<line x1="' + points[0].x.toFixed(1) + '" y1="' + (h - padB) + '" x2="' + points[0].x.toFixed(1) + '" y2="' + points[0].y.toFixed(1) + '" stroke="#ffd200" stroke-width="2"></line>';
    }

    var best = points.reduce(function (winner, p) {
      return !winner || p.row.seconds < winner.row.seconds ? p : winner;
    }, null);

    var dots = "";
    points.forEach(function (p) {
      var isPers = best && p.row.tid === best.row.tid && p.row.year === best.row.year;
      dots +=
        '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (isPers ? 8 : 6) + '" fill="#ffd200" stroke="#111111" stroke-width="1.8"></circle>';
      if (isPers) {
        dots +=
          '<text x="' + p.x.toFixed(1) + '" y="' + (p.y - 16).toFixed(1) + '" text-anchor="middle" fill="#111111" font-size="12" font-family="Barlow Condensed, sans-serif" font-weight="700" letter-spacing="1.6">PERS</text>';
      }
      hoverTargets.push(p);
    });

    svg.innerHTML =
      grid +
      axis +
      paths +
      '<line id="utover-hover" x1="0" y1="' + padT + '" x2="0" y2="' + (h - padB) + '" stroke="#ffd200" stroke-width="2" opacity="0"></line>' +
      dots;

    if (!reducedMotion) {
      var lines = svg.querySelectorAll(".utover-line");
      lines.forEach(function (path) {
        var length = 0;
        try {
          length = path.getTotalLength();
        } catch (err) {
          return;
        }
        path.style.strokeDasharray = String(length);
        path.style.strokeDashoffset = String(length);
        path.getBoundingClientRect();
        path.style.transition = "stroke-dashoffset 0.9s ease";
        path.style.strokeDashoffset = "0";
      });
    }

    setReadout(defaultReadout());
    draw.defaultReadout = defaultReadout;
  }

  function nearest(clientX, clientY) {
    if (!hoverTargets.length) return null;
    var rect = svg.getBoundingClientRect();
    var sx = ((clientX - rect.left) / rect.width) * w;
    var sy = ((clientY - rect.top) / rect.height) * h;
    var best = hoverTargets[0];
    var bestDist = Infinity;
    hoverTargets.forEach(function (p) {
      var dist = Math.hypot(p.x - sx, p.y - sy);
      if (dist < bestDist) {
        bestDist = dist;
        best = p;
      }
    });
    return bestDist < 90 ? best : null;
  }

  function show(p) {
    var lineEl = hoverLine();
    if (!p || !lineEl) return hide();
    lineEl.setAttribute("x1", p.x);
    lineEl.setAttribute("x2", p.x);
    lineEl.setAttribute("opacity", "1");
    var bits = [p.row.year, p.row.disiplin, p.row.tid];
    if (p.row.plass && String(p.row.plass) !== "—") bits.push(p.row.plass + ". plass");
    setReadout(bits.join("  ·  "));
  }

  function hide() {
    var lineEl = hoverLine();
    if (lineEl) lineEl.setAttribute("opacity", "0");
    setReadout(draw.defaultReadout ? draw.defaultReadout() : "Raskere tid ligger høyere.");
  }

  svg.addEventListener("mousemove", function (ev) {
    show(nearest(ev.clientX, ev.clientY));
  });
  svg.addEventListener("mouseleave", hide);
  svg.addEventListener("touchstart", function (ev) {
    if (!ev.touches[0]) return;
    show(nearest(ev.touches[0].clientX, ev.touches[0].clientY));
  }, { passive: true });

  if (filters && disciplines.length > 1) {
    filters.hidden = false;
    filters.setAttribute("role", "group");
    filters.setAttribute("aria-label", "Velg disiplin");
    disciplines.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "utover-filter";
      btn.setAttribute("data-id", item.id);
      btn.textContent = item.tittel;
      btn.addEventListener("click", function () {
        if (history.replaceState) {
          history.replaceState(null, "", "#" + item.id);
        } else {
          location.hash = item.id;
        }
        draw(item.id);
      });
      filters.appendChild(btn);
    });
  }

  draw(activeId);
})();
