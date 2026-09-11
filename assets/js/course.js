(function () {
  var config = window.KLOVSTIEN || {};
  if (!config.trackUrl) return;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var map;
  var runnerMarker;
  var flying = false;
  var flyRaf = 0;
  var track;
  var profileCtrl;

  fetch(config.trackUrl)
    .then(function (res) {
      if (!res.ok) throw new Error("Fant ikke løypedata");
      return res.json();
    })
    .then(function (data) {
      track = data;
      drawProfile(data);
      initMap(data);
    })
    .catch(function (err) {
      var readout = document.getElementById("profile-readout");
      if (readout) readout.textContent = "Løypeprofilen kunne ikke lastes.";
      console.error(err);
    });

  function drawProfile(data) {
    var svg = document.getElementById("profile");
    if (!svg) return;

    var pts = data.points;
    var w = 1000;
    var h = 280;
    var padL = 8;
    var padR = 8;
    var padT = 28;
    var padB = 36;
    var maxD = pts[pts.length - 1].d;
    var minE = Math.min.apply(null, pts.map(function (p) { return p.ele; }));
    var maxE = Math.max.apply(null, pts.map(function (p) { return p.ele; }));
    var ePad = 20;
    minE -= ePad;
    maxE += ePad;

    function x(d) {
      return padL + (d / maxD) * (w - padL - padR);
    }
    function y(ele) {
      return padT + (1 - (ele - minE) / (maxE - minE)) * (h - padT - padB);
    }

    var line = pts.map(function (p, i) {
      return (i === 0 ? "M" : "L") + x(p.d).toFixed(1) + " " + y(p.ele).toFixed(1);
    }).join(" ");

    var area =
      line +
      " L" + x(maxD).toFixed(1) + " " + (h - padB) +
      " L" + x(0).toFixed(1) + " " + (h - padB) +
      " Z";

    var ticks = "";
    for (var km = 0; km <= 17; km += 1) {
      var tx = x(km * 1000);
      ticks +=
        '<line x1="' + tx + '" y1="' + (h - padB) + '" x2="' + tx + '" y2="' + (h - padB + 6) + '" stroke="#111111" stroke-width="1.2"/>';
      if (km % 2 === 0) {
        ticks +=
          '<text x="' + tx + '" y="' + (h - 10) + '" text-anchor="middle" font-size="12" fill="#111111" font-family="Barlow Condensed, sans-serif" font-weight="700">' +
          km +
          "</text>";
      }
    }

    var labels = (data.landmarks || [])
      .map(function (lm) {
        var lx = x(lm.d);
        var ly = y(lm.ele) - 10;
        return (
          '<text x="' + lx + '" y="' + ly + '" text-anchor="middle" font-size="12" fill="#111111" font-family="Oswald, sans-serif" font-weight="700" letter-spacing="0.6">' +
          lm.name.toUpperCase() +
          "</text>"
        );
      })
      .join("");

    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.innerHTML =
      '<path d="' + area + '" fill="#ffd200" fill-opacity="0.28"></path>' +
      '<path d="' + line + '" fill="none" stroke="#111111" stroke-width="3.2" stroke-linejoin="miter"></path>' +
      ticks +
      labels +
      '<line id="profile-hover" x1="0" y1="' + padT + '" x2="0" y2="' + (h - padB) + '" stroke="#ffd200" stroke-width="2" opacity="0"></line>' +
      '<circle id="profile-dot" r="5" fill="#ffd200" stroke="#111111" stroke-width="1.5" opacity="0"></circle>';

    var hoverLine = document.getElementById("profile-hover");
    var hoverDot = document.getElementById("profile-dot");
    var readout = document.getElementById("profile-readout");

    function showOnProfile(p) {
      hoverLine.setAttribute("x1", x(p.d));
      hoverLine.setAttribute("x2", x(p.d));
      hoverLine.setAttribute("opacity", "1");
      hoverDot.setAttribute("cx", x(p.d));
      hoverDot.setAttribute("cy", y(p.ele));
      hoverDot.setAttribute("opacity", "1");
      if (readout) {
        readout.textContent = "KM " + (p.d / 1000).toFixed(1).replace(".", ",") + "  ·  " + Math.round(p.ele) + " MOH";
      }
    }

    function hideOnProfile() {
      hoverLine.setAttribute("opacity", "0");
      hoverDot.setAttribute("opacity", "0");
      if (readout) readout.textContent = "Dalbunn, så vegg.";
    }

    profileCtrl = {
      show: showOnProfile,
      hide: hideOnProfile
    };

    function pointAt(clientX) {
      var rect = svg.getBoundingClientRect();
      var ratio = (clientX - rect.left) / rect.width;
      var d = Math.max(0, Math.min(1, ratio)) * maxD;
      var closest = pts[0];
      var best = Infinity;
      for (var i = 0; i < pts.length; i++) {
        var diff = Math.abs(pts[i].d - d);
        if (diff < best) {
          best = diff;
          closest = pts[i];
        }
      }
      return closest;
    }

    function show(p) {
      showOnProfile(p);
      setRunner(p, true);
    }

    function hide() {
      if (flying) return;
      hideOnProfile();
      hideRunner();
    }

    svg.addEventListener("mousemove", function (ev) {
      if (flying) return;
      show(pointAt(ev.clientX));
    });
    svg.addEventListener("mouseleave", hide);
    svg.addEventListener("touchmove", function (ev) {
      if (flying || !ev.touches[0]) return;
      show(pointAt(ev.touches[0].clientX));
    }, { passive: true });
  }

  function initMap(data) {
    var container = document.getElementById("map");
    if (!container || typeof maplibregl === "undefined") return;

    var coords = data.points.map(function (p) {
      return [p.lon, p.lat];
    });
    var start = data.points[0];
    var end = data.points[data.points.length - 1];

    map = new maplibregl.Map({
      container: "map",
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          satellite: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: "Kartdata © Esri · høydedata Mapzen / AWS Terrain"
          },
          terrainSource: {
            type: "raster-dem",
            tiles: [
              "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
            ],
            encoding: "terrarium",
            tileSize: 256,
            maxzoom: 15
          }
        },
        layers: [
          { id: "satellite", type: "raster", source: "satellite" }
        ],
        terrain: { source: "terrainSource", exaggeration: 1.55 },
        sky: {
          "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.9, 14, 0.2]
        }
      },
      center: data.center,
      zoom: 10.8,
      pitch: 48,
      bearing: 186,
      maxPitch: 80,
      attributionControl: true
    });

    setupTouchLock();

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.TerrainControl({ source: "terrainSource", exaggeration: 1.55 }));

    runnerMarker = new maplibregl.Marker({
      element: runnerElement(),
      anchor: "bottom",
      pitchAlignment: "viewport",
      rotationAlignment: "viewport"
    });

    map.on("load", function () {
      map.addSource("course", {
        type: "geojson",
        lineMetrics: true,
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords }
        }
      });

      map.addLayer({
        id: "course-halo",
        type: "line",
        source: "course",
        paint: {
          "line-color": "#111111",
          "line-width": 8,
          "line-opacity": 0.85
        }
      });

      map.addLayer({
        id: "course-line",
        type: "line",
        source: "course",
        paint: {
          "line-color": "#ffd200",
          "line-width": 3.6
        }
      });

      addLabel(start, "Start");
      addLabel(end, "Mål");

      var bounds = new maplibregl.LngLatBounds();
      coords.forEach(function (c) { bounds.extend(c); });
      map.fitBounds(bounds, { padding: 80, pitch: 48, bearing: 186, duration: 0 });
    });

    var flyBtn = document.getElementById("fly-course");
    if (flyBtn) {
      flyBtn.addEventListener("click", function () {
        if (flying) {
          stopFly();
          return;
        }
        flyAlong(data.points);
      });
    }

    var resetBtn = document.getElementById("reset-map");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        stopFly();
        var bounds = new maplibregl.LngLatBounds();
        coords.forEach(function (c) { bounds.extend(c); });
        map.fitBounds(bounds, { padding: 80, pitch: 48, bearing: 186, duration: reducedMotion ? 0 : 1400 });
      });
    }
  }

  function needsTouchLock() {
    return window.matchMedia("(pointer: coarse), (max-width: 860px)").matches;
  }

  function setMapHandlers(enabled) {
    if (!map) return;
    var method = enabled ? "enable" : "disable";
    ["dragPan", "scrollZoom", "boxZoom", "dragRotate", "keyboard", "doubleClickZoom", "touchZoomRotate", "touchPitch"].forEach(function (name) {
      var handler = map[name];
      if (handler && typeof handler[method] === "function") handler[method]();
    });
  }

  function setupTouchLock() {
    var frame = document.querySelector(".map-frame");
    var unlockBtn = document.getElementById("unlock-map");
    if (!frame || !unlockBtn || !needsTouchLock()) return;

    function lock() {
      frame.classList.remove("is-interactive");
      unlockBtn.textContent = "Bruk kartet";
      unlockBtn.setAttribute("aria-pressed", "false");
      setMapHandlers(false);
    }

    function unlock() {
      frame.classList.add("is-interactive");
      unlockBtn.textContent = "Ferdig";
      unlockBtn.setAttribute("aria-pressed", "true");
      setMapHandlers(true);
    }

    unlockBtn.addEventListener("click", function () {
      if (frame.classList.contains("is-interactive")) lock();
      else unlock();
    });
    lock();

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) lock();
        });
      }, { threshold: 0.25 });
      observer.observe(frame);
    }
  }

  function runnerElement() {
    var wrap = document.createElement("div");
    wrap.className = "runner-marker";
    wrap.innerHTML = '<span class="runner-marker-dot"></span>';
    return wrap;
  }

  function setRunner(point, withProgress) {
    if (!map || !point) return;
    if (runnerMarker) {
      runnerMarker.setLngLat([point.lon, point.lat]).addTo(map);
    }
    if (withProgress && track) {
      paintProgress(point.d / track.points[track.points.length - 1].d);
    }
  }

  function hideRunner() {
    if (runnerMarker) runnerMarker.remove();
    paintProgress(1);
  }

  function paintProgress(ratio) {
    if (!map || !map.getLayer("course-line")) return;
    var t = Math.max(0.001, Math.min(0.999, ratio));
    map.setPaintProperty("course-line", "line-gradient", [
      "interpolate",
      ["linear"],
      ["line-progress"],
      0, "#ffd200",
      t, "#ffd200",
      Math.min(1, t + 0.012), "#f4f1e8",
      1, "#f4f1e8"
    ]);
  }
  function addLabel(point, text) {
    var el = document.createElement("div");
    el.className = "map-marker";
    el.textContent = text;
    new maplibregl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([point.lon, point.lat])
      .addTo(map);
  }

  function setFlyButton(active) {
    var btn = document.getElementById("fly-course");
    if (!btn) return;
    btn.textContent = active ? "Stopp" : "Følg løypa";
  }

  function stopFly() {
    flying = false;
    if (flyRaf) {
      cancelAnimationFrame(flyRaf);
      flyRaf = 0;
    }
    setFlyButton(false);
    hideRunner();
    if (profileCtrl) profileCtrl.hide();
  }

  function pointAtDistance(points, dist) {
    var last = points[points.length - 1];
    if (dist <= points[0].d) return points[0];
    if (dist >= last.d) return last;
    var lo = 0;
    var hi = points.length - 1;
    while (lo < hi - 1) {
      var mid = (lo + hi) >> 1;
      if (points[mid].d < dist) lo = mid;
      else hi = mid;
    }
    var a = points[lo];
    var b = points[hi];
    var span = b.d - a.d || 1;
    var t = (dist - a.d) / span;
    return {
      lat: a.lat + (b.lat - a.lat) * t,
      lon: a.lon + (b.lon - a.lon) * t,
      ele: a.ele + (b.ele - a.ele) * t,
      d: dist
    };
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function smoothstep(edge0, edge1, x) {
    var t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function shortestAngle(from, to) {
    return ((to - from + 540) % 360) - 180;
  }

  function flyAlong(points) {
    if (!map) return;

    var end = points[points.length - 1];
    if (reducedMotion) {
      map.easeTo({
        center: [end.lon, end.lat],
        zoom: 11.4,
        pitch: 46,
        bearing: 186,
        duration: 1600
      });
      return;
    }

    if (flyRaf) {
      cancelAnimationFrame(flyRaf);
      flyRaf = 0;
    }
    flying = true;
    setFlyButton(true);

    var duration = 26000;
    var maxTurn = 8;
    var valleyBearing = getBearing(points[0], end);
    var bearing = map.getBearing();
    var pitch = map.getPitch();
    var zoom = map.getZoom();
    var start = performance.now();
    var last = start;

    function frame(now) {
      if (!flying) return;

      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      var t = Math.min(1, (now - start) / duration);
      var d = easeInOut(t) * end.d;

      var pos = pointAtDistance(points, d);
      var steep = smoothstep(12800, 16500, d);
      var ahead = pointAtDistance(points, d + 2800 - 1600 * steep);
      var view = pointAtDistance(points, d + 650 - 420 * steep);

      var trackBearing = getBearing(pos, ahead);
      var blend = 0.18;
      var mixed = (valleyBearing + shortestAngle(valleyBearing, trackBearing) * blend + 360) % 360;
      var off = shortestAngle(valleyBearing, mixed);
      if (off > 12) off = 12;
      if (off < -12) off = -12;
      var targetBearing = (valleyBearing + off + 360) % 360;

      var turn = shortestAngle(bearing, targetBearing);
      var maxStep = maxTurn * dt;
      if (turn > maxStep) turn = maxStep;
      if (turn < -maxStep) turn = -maxStep;
      bearing = (bearing + turn + 360) % 360;

      var targetPitch = 62 + 4 * steep;
      var targetZoom = 11.15 + 1.65 * steep;
      var camAlpha = 1 - Math.exp(-dt / 0.85);
      pitch += (targetPitch - pitch) * camAlpha;
      zoom += (targetZoom - zoom) * camAlpha;

      map.jumpTo({
        center: [view.lon, view.lat],
        zoom: zoom,
        pitch: pitch,
        bearing: bearing
      });

      setRunner(pos, true);
      if (profileCtrl) profileCtrl.show(pos);

      if (t < 1) {
        flyRaf = requestAnimationFrame(frame);
      } else {
        flying = false;
        flyRaf = 0;
        setFlyButton(false);
      }
    }

    flyRaf = requestAnimationFrame(frame);
  }

  function getBearing(a, b) {
    var lat1 = a.lat * Math.PI / 180;
    var lat2 = b.lat * Math.PI / 180;
    var dLon = (b.lon - a.lon) * Math.PI / 180;
    var y = Math.sin(dLon) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }
})();
