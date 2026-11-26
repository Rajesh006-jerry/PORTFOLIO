
(function () {
  "use strict";
  if (window.ClickSpark) return;

  var SETTINGS = {
    sparkSize: 14,
    sparkRadius: 30,
    sparkCount: 8,
    sparkWidth: 2,
    duration: 500,
    easing: "ease-out", // linear | ease-in | ease-out | ease-in-out | spring
    extraScale: 1,
    shape: "line", // line | streak | dot | star
    randomness: 0.2,
    gravity: 0,
    spread: 360,
    direction: 0,
    glow: 0,
    ring: false,
    disabled: false,
    zIndex: 9999,
     colors: {
      dark: [
        "#ff3b30",
        "#ff9500",
        "#ffd60a",
        "#34c759",
        "#00e5ff",
        "#0a84ff",
        "#bf5af2",
        "#ff2d92",
      ],
      light: [
        "#e0201a",
        "#ff7a00",
        "#e6a800",
        "#16a34a",
        "#0891b2",
        "#2563eb",
        "#9333ea",
        "#db2777",
      ],
    },
  };

  // Phone / tablet (touch): multicolour Diwali-cracker burst
  var CRACKER = {
    shape: "streak",
    sparkCount:8,
    sparkSize: 16,
    sparkRadius: 52,
    sparkWidth: 3,
    duration: 800,
    easing: "ease-out",
    randomness: 0.55,
    gravity: 0.35,
    glow: 1,
    ring: true,
    colors: {
      dark: [
        "#ff3b30",
        "#ff9500",
        "#ffd60a",
        "#34c759",
        "#00e5ff",
        "#0a84ff",
        "#bf5af2",
        "#ff2d92",
      ],
      light: [
        "#e0201a",
        "#ff7a00",
        "#e6a800",
        "#16a34a",
        "#0891b2",
        "#2563eb",
        "#9333ea",
        "#db2777",
      ],
    },
  };
  var coarse =
    window.matchMedia &&
    window.matchMedia("(pointer: coarse), (hover: none)").matches;
  if (coarse) for (var k in CRACKER) SETTINGS[k] = CRACKER[k];

  var EASINGS = {
    linear: function (t) {
      return t;
    },
    "ease-in": function (t) {
      return t * t;
    },
    "ease-out": function (t) {
      return 1 - Math.pow(1 - t, 3);
    },
    "ease-in-out": function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    spring: function (t) {
      return 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
    },
  };
  var SHAPES = ["line", "streak", "dot", "star"];
  var MAX_BURSTS = 32;
  var GRAVITY = 500;
  var REDUCED_MS = 320;

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }
  function smoothstep(a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function starPath(ctx, x, y, radius, rotation) {
    var pinch = radius * 0.16;
    ctx.beginPath();
    ctx.moveTo(
      x + Math.cos(rotation) * radius,
      y + Math.sin(rotation) * radius,
    );
    for (var i = 1; i <= 4; i++) {
      var a = rotation + (i * Math.PI) / 2;
      var mid = a - Math.PI / 4;
      ctx.quadraticCurveTo(
        x + Math.cos(mid) * pinch,
        y + Math.sin(mid) * pinch,
        x + Math.cos(a) * radius,
        y + Math.sin(a) * radius,
      );
    }
    ctx.closePath();
  }

  function channels(ctx, color) {
    ctx.fillStyle = color;
    var normal = String(ctx.fillStyle);
    var hex = /^#([0-9a-f]{6})$/i.exec(normal);
    if (hex) {
      var v = parseInt(hex[1], 16);
      return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    }
    var rgb = /^rgba?\(([^)]+)\)$/i.exec(normal);
    if (rgb) {
      return rgb[1]
        .split(",")
        .slice(0, 3)
        .map(function (p) {
          return parseFloat(p);
        });
    }
    return [0, 0, 0];
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  }

  function init() {
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var bursts = [];
    var raf = 0;
    var lastPress = { time: -1e9, x: 0, y: 0 };

    var layer = document.createElement("div");
    layer.className = "click-spark-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText =
      "position:fixed;top:0;left:0;right:0;bottom:0;width:100%;height:100%;pointer-events:none;overflow:hidden;-webkit-transform:translateZ(0);z-index:" +
      SETTINGS.zIndex;
    document.body.appendChild(layer);

    function drop(s, seconds) {
      return 0.5 * s.gravity * GRAVITY * seconds * seconds;
    }
    function position(burst, spark, distance, seconds) {
      return [
        burst.x + Math.cos(spark.angle) * distance,
        burst.y + Math.sin(spark.angle) * distance + drop(burst.s, seconds),
      ];
    }

    function drawSpark(ctx, burst, spark, elapsed) {
      var s = burst.s;
      var life = reduced ? REDUCED_MS : s.duration * spark.life;
      var p = elapsed / life;
      if (p >= 1) return false;
      var e = reduced ? 0.55 : s.ease(clamp(p, 0, 1));
      var seconds = reduced ? 0 : elapsed / 1000;
      var distance = s.radius * spark.reach * e;
      var width = s.width * spark.scale;
      var fade = reduced
        ? 1 - p
        : 1 - smoothstep(s.shape === "line" ? 0.55 : 0.7, 1, p);
      if (fade <= 0) return true;
      ctx.strokeStyle = spark.color;
      ctx.fillStyle = spark.color;
      var pos, x, y;

      if (s.shape === "line") {
        var length =
          s.size * spark.scale * (reduced ? 0.5 : Math.pow(1 - p, 1.6));
        var a = position(burst, spark, distance, seconds);
        var b = position(
          burst,
          spark,
          distance + Math.max(0.01, length),
          seconds,
        );
        ctx.lineCap = "round";
        if (spark.glow > 0) {
          ctx.globalAlpha = fade * 0.14 * spark.glow;
          ctx.lineWidth = width * 4.5;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
        ctx.globalAlpha = fade;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        return true;
      }

      if (s.shape === "streak") {
        var lag = reduced
          ? 0
          : Math.min(elapsed, 70 + s.size * 4 * spark.scale);
        var back = reduced ? 0.4 : s.ease(clamp((elapsed - lag) / life, 0, 1));
        var h = position(burst, spark, distance, seconds);
        var t = position(
          burst,
          spark,
          s.radius * spark.reach * back,
          Math.max(0, seconds - lag / 1000),
        );
        var hx = h[0],
          hy = h[1],
          tx = t[0],
          ty = t[1];
        var dx = hx - tx,
          dy = hy - ty;
        var len = Math.hypot(dx, dy) || 1;
        var nx = (-dy / len) * width * 0.5;
        var ny = (dx / len) * width * 0.5;
        var paint = function (sw, alpha) {
          var g = ctx.createLinearGradient(tx, ty, hx, hy);
          g.addColorStop(0, spark.clear);
          g.addColorStop(1, spark.color);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(hx + nx * sw, hy + ny * sw);
          ctx.lineTo(hx - nx * sw, hy - ny * sw);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = spark.color;
          ctx.beginPath();
          ctx.arc(hx, hy, width * 0.5 * sw, 0, Math.PI * 2);
          ctx.fill();
        };
        if (spark.glow > 0) paint(3.2, fade * 0.16 * spark.glow);
        paint(1, fade);
        return true;
      }

      if (s.shape === "dot") {
        pos = position(burst, spark, distance, seconds);
        x = pos[0];
        y = pos[1];
        var r = width * 1.25 * (1 - 0.5 * e);
        if (spark.glow > 0) {
          ctx.globalAlpha = fade * 0.18 * spark.glow;
          ctx.beginPath();
          ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = fade;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        return true;
      }

      // star
      pos = position(burst, spark, distance, seconds);
      x = pos[0];
      y = pos[1];
      var twinkle = reduced
        ? 1 - p
        : Math.pow(Math.sin(Math.PI * clamp(p * 1.1, 0, 1)), 0.7);
      var radius = s.size * 0.6 * spark.scale * twinkle;
      var rotation = spark.angle + spark.spin * p * Math.PI * 0.5;
      if (radius <= 0.05) return true;
      if (spark.glow > 0) {
        ctx.globalAlpha = fade * 0.2 * spark.glow;
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = fade;
      starPath(ctx, x, y, radius, rotation);
      ctx.fill();
      return true;
    }

    function drawRing(ctx, burst, elapsed) {
      var s = burst.s;
      var life = reduced ? REDUCED_MS : s.duration * 0.8;
      var p = elapsed / life;
      if (p >= 1) return false;
      var radius =
        2 + s.radius * 0.6 * (reduced ? 0.6 : EASINGS["ease-out"](p));
      ctx.globalAlpha = Math.pow(1 - p, 2) * 0.7;
      ctx.strokeStyle = burst.sparks[0] ? burst.sparks[0].color : s.colors[0];
      ctx.lineWidth = Math.max(0.5, s.width * (1 - p) * 0.9);
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    }

    function remove(burst) {
      burst.canvas.remove();
      var i = bursts.indexOf(burst);
      if (i >= 0) bursts.splice(i, 1);
    }

    function frame(now) {
      raf = 0;
      bursts.slice().forEach(function (burst) {
        var elapsed = now - burst.start;
        var ctx = burst.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, burst.canvas.width, burst.canvas.height);
        ctx.setTransform(
          burst.ratio,
          0,
          0,
          burst.ratio,
          -burst.left * burst.ratio,
          -burst.top * burst.ratio,
        );
        var alive = false;
        if (burst.s.ring && drawRing(ctx, burst, elapsed)) alive = true;
        burst.sparks.forEach(function (spark) {
          if (drawSpark(ctx, burst, spark, elapsed)) alive = true;
        });
        ctx.globalAlpha = 1;
        if (!alive) remove(burst);
      });
      if (bursts.length) raf = requestAnimationFrame(frame);
    }

    function resolve() {
      var o = SETTINGS;
      var list = (o.colors[currentTheme()] || o.colors.dark).filter(Boolean);
      return {
        colors: list.length ? list : ["#ffffff"],
        size: Math.max(0, o.sparkSize),
        radius: Math.max(0, o.sparkRadius) * Math.max(0, o.extraScale),
        count: clamp(Math.round(o.sparkCount), 1, 64),
        width: Math.max(0.5, o.sparkWidth),
        duration: Math.max(60, o.duration),
        ease: EASINGS[o.easing] || EASINGS["ease-out"],
        shape: SHAPES.indexOf(o.shape) >= 0 ? o.shape : "line",
        randomness: clamp(o.randomness, 0, 1),
        gravity: Math.max(0, o.gravity),
        spread: clamp(o.spread, 0, 360),
        direction: o.direction,
        glow: clamp(o.glow, 0, 1),
        ring: o.ring,
        disabled: o.disabled,
      };
    }

    function spawn(cx, cy) {
      var s = resolve();
      if (s.disabled) return;
      var offset = Math.floor(Math.random() * s.colors.length);
      var full = s.spread >= 359.5;
      var arc = (s.spread * Math.PI) / 180;
      var heading = ((s.direction - 90) * Math.PI) / 180;
      var step = full
        ? (Math.PI * 2) / s.count
        : s.count > 1
          ? arc / (s.count - 1)
          : 0;
      var sparks = [];
      for (var i = 0; i < s.count; i++) {
        var base = full
          ? heading + step * i
          : s.count > 1
            ? heading - arc / 2 + step * i
            : heading;
        var jitter = (Math.random() - 0.5) * s.randomness;
        sparks.push({
          angle: base + jitter * (step || arc || 1) * 0.9,
          reach: 1 + (Math.random() - 0.5) * 0.7 * s.randomness,
          scale: 1 + (Math.random() - 0.5) * 0.8 * s.randomness,
          life: 1 + (Math.random() - 0.5) * 0.5 * s.randomness,
          spin: Math.random() - 0.5,
          color:
            s.colors.length > 2
              ? s.colors[Math.floor(Math.random() * s.colors.length)]
              : s.colors[(i + offset) % s.colors.length],
          clear: "",
          glow: 0,
        });
      }
      var longest = s.duration * (1 + 0.25 * s.randomness);
      var fall = drop(s, longest / 1000);
      var reach =
        s.radius *
          (1 + 0.35 * s.randomness) *
          (s.ease === EASINGS.spring ? 1.15 : 1) +
        s.size * (1 + 0.4 * s.randomness) +
        s.width * (s.glow > 0 ? 6 : 2) +
        6;
      var box = {
        left: Math.max(cx - reach, 0),
        top: Math.max(cy - reach, 0),
        right: Math.min(cx + reach, window.innerWidth),
        bottom: Math.min(cy + reach + fall, window.innerHeight),
      };
      if (box.right - box.left < 1 || box.bottom - box.top < 1) return;
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      var canvas = document.createElement("canvas");
      canvas.width = Math.ceil((box.right - box.left) * ratio);
      canvas.height = Math.ceil((box.bottom - box.top) * ratio);
      canvas.style.cssText =
        "position:absolute;display:block;pointer-events:none;" +
        "left:" +
        box.left +
        "px;top:" +
        box.top +
        "px;" +
        "width:" +
        (box.right - box.left) +
        "px;height:" +
        (box.bottom - box.top) +
        "px;";
      canvas.setAttribute("aria-hidden", "true");
      layer.appendChild(canvas);
      var ctx = canvas.getContext("2d");
      if (!ctx) {
        canvas.remove();
        return;
      }
      sparks.forEach(function (spark) {
        var c = channels(ctx, spark.color);
        spark.clear = "rgba(" + c[0] + ", " + c[1] + ", " + c[2] + ", 0)";
        spark.glow =
          s.glow *
          (0.35 +
            0.65 * ((0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255));
      });
      bursts.push({
        x: cx,
        y: cy,
        start: performance.now(),
        sparks: sparks,
        s: s,
        canvas: canvas,
        ctx: ctx,
        ratio: ratio,
        left: box.left,
        top: box.top,
      });
      while (bursts.length > MAX_BURSTS) remove(bursts[0]);
      if (!raf) raf = requestAnimationFrame(frame);
    }

    // Mouse: fire instantly on pointerdown. Touch / pen: fire on pointerup when it
    // was a tap (not a scroll/swipe). Using pointer events instead of "click"
    // fixes iOS Safari, which never fires click on non-interactive elements.
    var down = null;
    var lastSpawn = { time: -1e9, x: 0, y: 0 };
    function fire(x, y) {
      var now = performance.now();
      if (
        now - lastSpawn.time < 350 &&
        Math.hypot(x - lastSpawn.x, y - lastSpawn.y) < 24
      )
        return;
      lastSpawn = { time: now, x: x, y: y };
      spawn(x, y);
    }

    if (window.PointerEvent) {
      document.addEventListener(
        "pointerdown",
        function (e) {
          if (e.pointerType === "mouse") {
            if (e.button === 0) fire(e.clientX, e.clientY);
            return;
          }
          down = {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            t: performance.now(),
          };
        },
        { passive: true },
      );
      document.addEventListener(
        "pointerup",
        function (e) {
          if (e.pointerType === "mouse" || !down || down.id !== e.pointerId)
            return;
          var moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
          var held = performance.now() - down.t;
          down = null;
          if (moved < 12 && held < 700) fire(e.clientX, e.clientY);
        },
        { passive: true },
      );
      document.addEventListener(
        "pointercancel",
        function () {
          down = null;
        },
        { passive: true },
      );
    } else {
      // Old iOS / browsers without Pointer Events
      document.addEventListener(
        "touchstart",
        function (e) {
          var t = e.changedTouches[0];
          down = { x: t.clientX, y: t.clientY, t: performance.now() };
        },
        { passive: true },
      );
      document.addEventListener(
        "touchend",
        function (e) {
          if (!down) return;
          var t = e.changedTouches[0];
          var moved = Math.hypot(t.clientX - down.x, t.clientY - down.y);
          var held = performance.now() - down.t;
          down = null;
          if (moved < 12 && held < 700) fire(t.clientX, t.clientY);
        },
        { passive: true },
      );
      document.addEventListener(
        "mousedown",
        function (e) {
          if (e.button === 0) fire(e.clientX, e.clientY);
        },
        { passive: true },
      );
    }

    // Keyboard-activated clicks (no pointer position)
    document.addEventListener(
      "click",
      function (e) {
        if (e.detail !== 0) return;
        var target = e.target instanceof Element ? e.target : document.body;
        var r = target.getBoundingClientRect();
        fire(r.left + r.width / 2, r.top + r.height / 2);
      },
      { passive: true },
    );

    window.ClickSpark = {
      spark: function (x, y) {
        spawn(
          x == null ? window.innerWidth / 2 : x,
          y == null ? window.innerHeight / 2 : y,
        );
      },
      update: function (opts) {
        if (opts)
          Object.keys(opts).forEach(function (k) {
            SETTINGS[k] = opts[k];
          });
        if (opts && opts.zIndex !== undefined)
          layer.style.zIndex = SETTINGS.zIndex;
      },
      settings: SETTINGS,
    };
  }

  if (document.body) init();
  else document.addEventListener("DOMContentLoaded", init);
})();
