/* ==========================================================================
   ORBIT IMAGES — vanilla JS port (no React / build step)
   Items travel around a circular / elliptical path.
   Supports: radius / radiusX / radiusY, rotation, duration, direction,
   itemSize, showPath + pathDash, centerContent, hoverScale, hoverSpeed,
   shadow, draggable, clickToFront, paused, depth.

   Usage:
     OrbitImages(hostElement, {
       items: [{ html: "<svg…/>", label: "React", dim: false }],
       shape: "circle", radius: 170, duration: 20, itemSize: 56, ...
     });
   ========================================================================== */
(function () {
  "use strict";
  if (window.OrbitImages) return;

  /* ------------------------------------------------------------------ CSS */
  var css = [
    ".orbit-stage{position:relative;width:min(100%,36rem);aspect-ratio:1/1;margin:0 auto}",
    ".orbit{position:absolute;inset:0;pointer-events:none;--orbit-item-bg:rgba(24,22,16,.92);--orbit-tip-bg:#111}",
    'html[data-theme="light"] .orbit{--orbit-item-bg:#fff;--orbit-tip-bg:#fff}',
    ".orbit:hover{z-index:5}",
    ".orbit__path{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}",
    ".orbit__path ellipse{fill:none;stroke:rgba(var(--a-rgb,230,185,60),.3)}",
    ".orbit__item{position:absolute;left:0;top:0;display:grid;place-items:center;margin:0;padding:0;",
    "border-radius:50%;pointer-events:auto;cursor:grab;touch-action:pan-y;user-select:none;-webkit-user-select:none;",
    "border:1px solid var(--gold-line,rgba(230,185,60,.25));background:var(--orbit-item-bg);",
    "will-change:transform;backface-visibility:hidden;outline:none;color:inherit}",
    ".orbit__item:active{cursor:grabbing}",
    ".orbit__item svg{width:54%;height:54%;display:block;pointer-events:none}",
    'html:not([data-theme="light"]) .orbit__item[data-dim] svg{fill:#fff!important}',
    ".orbit__item:focus-visible{box-shadow:0 0 0 2px rgba(var(--a-rgb,230,185,60),.9)}",
    ".orbit__item::after{content:attr(data-label);position:absolute;top:calc(100% + 8px);left:50%;",
    "transform:translateX(-50%) translateY(4px);white-space:nowrap;pointer-events:none;opacity:0;",
    "transition:opacity .18s ease,transform .18s ease;font:600 .72rem/1 system-ui,sans-serif;letter-spacing:.02em;",
    "padding:.4rem .6rem;border-radius:.5rem;background:var(--orbit-tip-bg);color:var(--e-fg,#fff);",
    "border:1px solid var(--gold-line,rgba(230,185,60,.25));box-shadow:0 8px 20px rgba(0,0,0,.25)}",
    ".orbit__item:hover::after,.orbit__item:focus-visible::after,.orbit__item.is-front::after{opacity:1;transform:translateX(-50%) translateY(0)}",
    ".orbit__item.is-front{z-index:20}",
    "@keyframes orbit-spin{to{transform:rotate(360deg)}}",
    ".orbit--css .orbit__ring{position:absolute;inset:0;pointer-events:none;will-change:transform;animation:orbit-spin var(--od,20s) linear infinite;animation-direction:var(--odir,normal)}",
    ".orbit--css .orbit__hold{position:absolute;left:50%;top:50%;width:0;height:0}",
    ".orbit--css .orbit__hold.is-front{z-index:20}",
    ".orbit--css .orbit__item{left:0;top:0;cursor:pointer;will-change:transform;transition:scale .2s ease;animation:orbit-spin var(--od,20s) linear infinite;animation-direction:var(--oinv,reverse)}",
    ".orbit--css .orbit__item.is-front{scale:1.35}",
    ".orbit--off .orbit__ring,.orbit--off .orbit__item{animation-play-state:paused}",
    "@media (prefers-reduced-motion:reduce){.orbit--css .orbit__ring,.orbit--css .orbit__item{animation:none}}",
    ".orbit__center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1;pointer-events:none;text-align:center}",
  ].join("");
  var style = document.createElement("style");
  style.id = "orbit-images-css";
  style.textContent = css;
  document.head.appendChild(style);

  /* -------------------------------------------------------------- helpers */
  var TAU = Math.PI * 2;
  function clamp(v, a, b) {
    return Math.min(b, Math.max(a, v));
  }
  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVG_NS = "http://www.w3.org/2000/svg";

  /* One shared animation loop for every ring (instead of one rAF per ring) */
  var instances = [];
  var sharedRaf = 0;
  function sharedFrame(now) {
    sharedRaf = 0;
    var any = false;
    for (var i = 0; i < instances.length; i++) {
      if (instances[i].wanted()) {
        any = true;
        instances[i].run(now);
      }
    }
    if (any) sharedRaf = requestAnimationFrame(sharedFrame);
  }
  function kick() {
    if (!sharedRaf && !document.hidden)
      sharedRaf = requestAnimationFrame(sharedFrame);
  }

  /* ------------------------------------------------- phone / CSS mode ----
     Continuous, never pauses, no intro, no drag, no JS per frame.
     The ring <div> spins with a CSS animation and every icon counter-spins
     so it stays upright -> both run on the GPU compositor. */
  var PHONE = window.matchMedia
    ? window.matchMedia("(max-width: 767px)")
    : { matches: false };

  function buildCss(host, o) {
    host.classList.add("orbit", "orbit--css");
    host.innerHTML = "";
    var rev = o.direction === "reverse";
    var W = 0,
      scale = 1,
      size = 0;

    var pathSvg = document.createElementNS(SVG_NS, "svg");
    pathSvg.setAttribute("class", "orbit__path");
    pathSvg.setAttribute("aria-hidden", "true");
    var pathEl = document.createElementNS(SVG_NS, "ellipse");
    pathSvg.appendChild(pathEl);
    if (o.showPath) host.appendChild(pathSvg);

    var ring = document.createElement("div");
    ring.className = "orbit__ring";
    ring.style.setProperty("--od", Math.max(1, o.duration) + "s");
    ring.style.setProperty("--odir", rev ? "reverse" : "normal");
    ring.style.setProperty("--oinv", rev ? "normal" : "reverse");
    host.appendChild(ring);

    var n = o.items.length,
      timer = 0,
      front = null;
    var holds = o.items.map(function (def, i) {
      var hold = document.createElement("div");
      hold.className = "orbit__hold";
      var el = document.createElement("button");
      el.type = "button";
      el.className = "orbit__item";
      el.setAttribute("aria-label", def.label || "Item " + (i + 1));
      if (def.label) el.setAttribute("data-label", def.label);
      if (def.dim) el.setAttribute("data-dim", "");
      el.innerHTML = def.html || "";
      el.style.boxShadow = "0 4px 12px rgba(0,0,0," + o.shadow + ")";
      el.addEventListener("click", function () {
        clearTimeout(timer);
        var was = hold === front;
        if (front) {
          front.classList.remove("is-front");
          front.firstChild.classList.remove("is-front");
          front = null;
        }
        if (!was && o.clickToFront) {
          front = hold;
          hold.classList.add("is-front");
          el.classList.add("is-front");
          timer = setTimeout(function () {
            // label auto-hides, orbit never stops
            hold.classList.remove("is-front");
            el.classList.remove("is-front");
            front = null;
          }, 2500);
        }
      });
      hold.appendChild(el);
      ring.appendChild(hold);
      return hold;
    });

    function layout() {
      W = host.clientWidth;
      if (!W) return;
      scale = o.baseWidth ? W / o.baseWidth : 1;
      size = Math.round(Math.max(o.itemSize * scale, o.minItemSize || 0));
      var r = o.radius * scale,
        start = (o.startAngle * Math.PI) / 180;
      holds.forEach(function (hold, i) {
        var a = start + (i / n) * TAU;
        hold.style.transform =
          "translate3d(" +
          (r * Math.cos(a)).toFixed(1) +
          "px," +
          (r * Math.sin(a)).toFixed(1) +
          "px,0)";
        var el = hold.firstChild;
        el.style.width = el.style.height = size + "px";
        el.style.marginLeft = el.style.marginTop = -size / 2 + "px";
      });
      pathSvg.setAttribute("width", W);
      pathSvg.setAttribute("height", W);
      pathEl.setAttribute("cx", W / 2);
      pathEl.setAttribute("cy", host.clientHeight / 2);
      pathEl.setAttribute("rx", r);
      pathEl.setAttribute("ry", r);
      pathEl.setAttribute("stroke-width", o.pathWidth);
      pathEl.setAttribute(
        "stroke-dasharray",
        o.pathDash ? o.pathDash + " " + o.pathDash : "none",
      );
    }

    if (o.centerContent) {
      var center = document.createElement("div");
      center.className = "orbit__center";
      if (typeof o.centerContent === "string")
        center.innerHTML = o.centerContent;
      else center.appendChild(o.centerContent);
      host.appendChild(center);
    }

    var ro = new ResizeObserver(layout);
    ro.observe(host);
    // spin only while on screen (saves battery); resumes instantly
    var io = new IntersectionObserver(function (es) {
      host.classList.toggle(
        "orbit--off",
        !es.some(function (e) {
          return e.isIntersecting;
        }),
      );
    });
    io.observe(host);
    layout();

    return {
      update: function (patch) {
        for (var k in patch) o[k] = patch[k];
        layout();
      },
      setPaused: function () {}, // phone mode intentionally never pauses
      destroy: function () {
        clearTimeout(timer);
        ro.disconnect();
        io.disconnect();
        host.classList.remove("orbit--css", "orbit--off");
        host.innerHTML = "";
      },
    };
  }

  /* ------------------------------------------------------------ component */
  function OrbitImages(host, options) {
    var o = {
      items: [],
      shape: "circle", // "circle" | "ellipse"
      radius: 170,
      radiusX: 340,
      radiusY: 80,
      rotation: 0, // degrees, tilts the whole path
      duration: 20, // seconds per revolution
      itemSize: 72,
      minItemSize: 0, // px floor so icons stay tappable on phones
      direction: "normal", // "normal" | "reverse"
      baseWidth: 0, // design width the radii are specified for (0 = 1:1)
      startAngle: 0, // degrees
      showPath: true,
      pathDash: 5,
      pathWidth: 1,
      hoverScale: 1.08,
      hoverSpeed: 1, // speed multiplier while hovering (1 = never slows)
      shadow: 0.3,
      draggable: true,
      clickToFront: true,
      paused: false,
      depth: 0, // 0 = flat, 1 = strong depth cue
      centerContent: null, // HTML string or Element
      mode: "auto", // "auto" = CSS spin on phones, JS physics on desktop
    };
    for (var k in options) o[k] = options[k];

    // phones: continuous CSS-driven orbit (circle only). o.mode = "js" | "css" | "auto"
    if (
      o.shape === "circle" &&
      (o.mode === "css" || (o.mode !== "js" && PHONE.matches))
    )
      return buildCss(host, o);

    host.classList.add("orbit");
    host.innerHTML = "";

    var W = 0,
      H = 0,
      scale = 1;
    var rx = 0,
      ry = 0,
      rot = 0;

    /* path */
    var pathSvg = document.createElementNS(SVG_NS, "svg");
    pathSvg.setAttribute("class", "orbit__path");
    pathSvg.setAttribute("aria-hidden", "true");
    var pathEl = document.createElementNS(SVG_NS, "ellipse");
    pathSvg.appendChild(pathEl);
    if (o.showPath) host.appendChild(pathSvg);

    /* items */
    var items = o.items.map(function (def, i) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "orbit__item";
      el.setAttribute("aria-label", def.label || "Item " + (i + 1));
      if (def.label) el.setAttribute("data-label", def.label);
      if (def.dim) el.setAttribute("data-dim", "");
      el.innerHTML = def.html || "";
      el.style.boxShadow = "0 8px 22px rgba(0,0,0," + o.shadow + ")";
      host.appendChild(el);
      return { el: el, hover: false, scale: 1, introAt: 0, front: false };
    });

    /* centre content */
    if (o.centerContent) {
      var center = document.createElement("div");
      center.className = "orbit__center";
      if (typeof o.centerContent === "string")
        center.innerHTML = o.centerContent;
      else center.appendChild(o.centerContent);
      host.appendChild(center);
    }

    /* state */
    var phase = (o.startAngle * Math.PI) / 180;
    var speed = 1; // eased multiplier
    var inertia = 0; // rad/s from drag fling
    var visible = true; // spin from the very first frame
    var alive = true;
    var scaling = false;
    var last = 0;
    var drag = null;
    var anyHover = false;

    function layout() {
      W = host.clientWidth;
      H = host.clientHeight;
      scale = o.baseWidth ? W / o.baseWidth : 1;
      var base =
        o.shape === "ellipse" ? [o.radiusX, o.radiusY] : [o.radius, o.radius];
      rx = base[0] * scale;
      ry = base[1] * scale;
      rot = (o.rotation * Math.PI) / 180;
      var size = Math.max(o.itemSize * scale, o.minItemSize || 0);
      items.forEach(function (it) {
        it.el.style.width = size + "px";
        it.el.style.height = size + "px";
      });
      pathSvg.setAttribute("width", W);
      pathSvg.setAttribute("height", H);
      pathEl.setAttribute("cx", W / 2);
      pathEl.setAttribute("cy", H / 2);
      pathEl.setAttribute("rx", rx);
      pathEl.setAttribute("ry", ry);
      pathEl.setAttribute("stroke-width", o.pathWidth);
      pathEl.setAttribute(
        "stroke-dasharray",
        o.pathDash ? o.pathDash + " " + o.pathDash : "none",
      );
      pathEl.setAttribute(
        "transform",
        "rotate(" + o.rotation + " " + W / 2 + " " + H / 2 + ")",
      );
    }

    function place(now) {
      if (!W || !H) return;
      var n = items.length;
      var cosR = Math.cos(rot),
        sinR = Math.sin(rot);
      var anyScaling = false;
      for (var i = 0; i < n; i++) {
        var it = items[i];
        var a = phase + (i / n) * TAU;
        var ex = rx * Math.cos(a);
        var ey = ry * Math.sin(a);

        var x = ex * cosR - ey * sinR;
        var y = ex * sinR + ey * cosR;

        /* depth cue (optional) */
        var f = ry ? ey / ry : 0; // -1 (far) … 1 (near)
        var depthScale = 1 + o.depth * 0.22 * f;

        var target = it.front ? 1.35 : it.hover ? o.hoverScale : 1;
        it.scale += (target - it.scale) * 0.2;
        if (Math.abs(target - it.scale) < 0.002) it.scale = target;
        else anyScaling = true;

        var s = it.scale * depthScale;
        if (o.depth) {
          var op = (1 - o.depth * 0.15 * (1 - f)).toFixed(3);
          if (it.op !== op) {
            it.op = op;
            it.el.style.opacity = op;
          }
        }
        var tf =
          "translate3d(" +
          (W / 2 + x).toFixed(2) +
          "px," +
          (H / 2 + y).toFixed(2) +
          "px,0) translate(-50%,-50%) scale(" +
          s.toFixed(3) +
          ")";
        if (it.tf !== tf) {
          it.tf = tf;
          it.el.style.transform = tf;
        }
      }
      scaling = anyScaling;
    }

    function run(now) {
      // every frame, no throttling -> smooth, no perceived lag
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;

      // speed snaps instantly (no easing ramp up/down)
      speed = o.paused || reduce ? 0 : anyHover || drag ? o.hoverSpeed : 1;

      var dir = o.direction === "reverse" ? -1 : 1;
      if (!drag) {
        phase += dir * (TAU / Math.max(0.1, o.duration)) * speed * dt;
        phase += inertia * dt;
        inertia *= Math.exp(-dt * 3);
        if (Math.abs(inertia) < 0.001) inertia = 0;
      }
      place(now);
    }

    function wake() {
      if (alive && visible) kick();
    }
    var self = {
      run: run,
      wanted: function () {
        return alive && visible && !document.hidden;
      },
    };
    instances.push(self);

    /* ---- interaction ---- */
    function pointerAngle(e) {
      var r = host.getBoundingClientRect();
      var px = e.clientX - r.left - r.width / 2;
      var py = e.clientY - r.top - r.height / 2;
      var cx = px * Math.cos(-rot) - py * Math.sin(-rot);
      var cy = px * Math.sin(-rot) + py * Math.cos(-rot);
      return Math.atan2(cy / (ry || 1), cx / (rx || 1));
    }

    function clearFront(except) {
      document.dispatchEvent(
        new CustomEvent("orbit:front", { detail: except }),
      );
    }
    function onFront(e) {
      if (e.detail === host) return;
      items.forEach(function (it) {
        it.front = false;
        it.el.classList.remove("is-front");
      });
    }
    document.addEventListener("orbit:front", onFront);

    items.forEach(function (it) {
      var el = it.el;
      el.addEventListener("pointerenter", function () {
        it.hover = true;
        anyHover = true;
        wake();
      });
      el.addEventListener("pointerleave", function () {
        it.hover = false;
        anyHover = items.some(function (x) {
          return x.hover;
        });
      });

      el.addEventListener("pointerdown", function (e) {
        if (!o.draggable || e.button > 0) return;
        drag = {
          id: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          angle: pointerAngle(e),
          moved: false,
          lastT: performance.now(),
          vel: 0,
        };
        inertia = 0;
        try {
          el.setPointerCapture(e.pointerId);
        } catch (err) {}
      });

      el.addEventListener("pointermove", function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        if (
          !drag.moved &&
          Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 5
        )
          drag.moved = true;
        if (!drag.moved) return;
        var a = pointerAngle(e);
        var d = a - drag.angle;
        if (d > Math.PI) d -= TAU;
        if (d < -Math.PI) d += TAU;
        drag.angle = a;
        phase += d;
        var now = performance.now();
        var dtm = Math.max(1, now - drag.lastT) / 1000;
        drag.vel = drag.vel * 0.6 + (d / dtm) * 0.4;
        drag.lastT = now;
      });

      function end(e) {
        if (!drag || e.pointerId !== drag.id) return;
        if (drag.moved) inertia = clamp(drag.vel, -4, 4);
        el.__wasDrag = drag.moved;
        drag = null;
      }
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);

      el.addEventListener("click", function () {
        if (el.__wasDrag) {
          el.__wasDrag = false;
          return;
        }
        if (!o.clickToFront) return;
        var was = it.front;
        clearFront(host);
        items.forEach(function (x) {
          x.front = false;
          x.el.classList.remove("is-front");
        });
        if (!was) {
          it.front = true;
          el.classList.add("is-front");
        }
        wake();
      });
    });

    /* ---- observers ---- */
    var ro = new ResizeObserver(function () {
      layout();
      place(performance.now());
      wake();
    });
    ro.observe(host);

    var io = new IntersectionObserver(
      function (entries) {
        var v = entries.some(function (e) {
          return e.isIntersecting;
        });
        visible = v;
        if (v) {
          last = 0;
          wake();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(host);

    function onVis() {
      last = 0;
      wake();
    }
    document.addEventListener("visibilitychange", onVis);

    layout();
    place(performance.now());
    wake(); // start rotating immediately

    return {
      update: function (patch) {
        for (var k in patch) o[k] = patch[k];
        layout();
        place(performance.now());
        wake();
      },
      setPaused: function (p) {
        o.paused = !!p;
        wake();
      },
      destroy: function () {
        alive = false;
        var ix = instances.indexOf(self);
        if (ix > -1) instances.splice(ix, 1);
        ro.disconnect();
        io.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        document.removeEventListener("orbit:front", onFront);
        host.innerHTML = "";
      },
    };
  }

  window.OrbitImages = OrbitImages;
})();
