!(function () {
  "use strict";
  if (!window.OrbitImages) {
    var t = [
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
      ].join(""),
      e = document.createElement("style");
    ((e.id = "orbit-images-css"),
      (e.textContent = t),
      document.head.appendChild(e));
    var i = 2 * Math.PI,
      r =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      n = "http://www.w3.org/2000/svg",
      a = [],
      o = 0,
      s = window.matchMedia
        ? window.matchMedia("(max-width: 767px)")
        : { matches: !1 };
    window.OrbitImages = function (t, e) {
      var l = {
        items: [],
        shape: "circle",
        radius: 170,
        radiusX: 340,
        radiusY: 80,
        rotation: 0,
        duration: 20,
        itemSize: 72,
        minItemSize: 0,
        direction: "normal",
        baseWidth: 0,
        startAngle: 0,
        showPath: !0,
        pathDash: 5,
        pathWidth: 1,
        hoverScale: 1.08,
        hoverSpeed: 1,
        shadow: 0.3,
        draggable: !0,
        clickToFront: !0,
        paused: !1,
        depth: 0,
        centerContent: null,
        mode: "auto",
      };
      for (var c in e) l[c] = e[c];
      if (
        "circle" === l.shape &&
        ("css" === l.mode || ("js" !== l.mode && s.matches))
      )
        return (function (t, e) {
          (t.classList.add("orbit", "orbit--css"), (t.innerHTML = ""));
          var r = "reverse" === e.direction,
            a = 0,
            o = 1,
            s = 0,
            d = document.createElementNS(n, "svg");
          (d.setAttribute("class", "orbit__path"),
            d.setAttribute("aria-hidden", "true"));
          var l = document.createElementNS(n, "ellipse");
          (d.appendChild(l), e.showPath && t.appendChild(d));
          var c = document.createElement("div");
          ((c.className = "orbit__ring"),
            c.style.setProperty("--od", Math.max(1, e.duration) + "s"),
            c.style.setProperty("--odir", r ? "reverse" : "normal"),
            c.style.setProperty("--oinv", r ? "normal" : "reverse"),
            t.appendChild(c));
          var h = e.items.length,
            m = 0,
            u = null,
            b = e.items.map(function (t, i) {
              var r = document.createElement("div");
              r.className = "orbit__hold";
              var n = document.createElement("button");
              return (
                (n.type = "button"),
                (n.className = "orbit__item"),
                n.setAttribute("aria-label", t.label || "Item " + (i + 1)),
                t.label && n.setAttribute("data-label", t.label),
                t.dim && n.setAttribute("data-dim", ""),
                (n.innerHTML = t.html || ""),
                (n.style.boxShadow = "0 4px 12px rgba(0,0,0," + e.shadow + ")"),
                n.addEventListener("click", function () {
                  clearTimeout(m);
                  var t = r === u;
                  (u &&
                    (u.classList.remove("is-front"),
                    u.firstChild.classList.remove("is-front"),
                    (u = null)),
                    !t &&
                      e.clickToFront &&
                      ((u = r),
                      r.classList.add("is-front"),
                      n.classList.add("is-front"),
                      (m = setTimeout(function () {
                        (r.classList.remove("is-front"),
                          n.classList.remove("is-front"),
                          (u = null));
                      }, 2500))));
                }),
                r.appendChild(n),
                c.appendChild(r),
                r
              );
            });
          function p() {
            if ((a = t.clientWidth)) {
              ((o = e.baseWidth ? a / e.baseWidth : 1),
                (s = Math.round(Math.max(e.itemSize * o, e.minItemSize || 0))));
              var r = e.radius * o,
                n = (e.startAngle * Math.PI) / 180;
              (b.forEach(function (t, e) {
                var a = n + (e / h) * i;
                t.style.transform =
                  "translate3d(" +
                  (r * Math.cos(a)).toFixed(1) +
                  "px," +
                  (r * Math.sin(a)).toFixed(1) +
                  "px,0)";
                var o = t.firstChild;
                ((o.style.width = o.style.height = s + "px"),
                  (o.style.marginLeft = o.style.marginTop = -s / 2 + "px"));
              }),
                d.setAttribute("width", a),
                d.setAttribute("height", a),
                l.setAttribute("cx", a / 2),
                l.setAttribute("cy", t.clientHeight / 2),
                l.setAttribute("rx", r),
                l.setAttribute("ry", r),
                l.setAttribute("stroke-width", e.pathWidth),
                l.setAttribute(
                  "stroke-dasharray",
                  e.pathDash ? e.pathDash + " " + e.pathDash : "none",
                ));
            }
          }
          if (e.centerContent) {
            var f = document.createElement("div");
            ((f.className = "orbit__center"),
              "string" == typeof e.centerContent
                ? (f.innerHTML = e.centerContent)
                : f.appendChild(e.centerContent),
              t.appendChild(f));
          }
          var v = new ResizeObserver(p);
          v.observe(t);
          var g = new IntersectionObserver(function (e) {
            t.classList.toggle(
              "orbit--off",
              !e.some(function (t) {
                return t.isIntersecting;
              }),
            );
          });
          return (
            g.observe(t),
            p(),
            {
              update: function (t) {
                for (var i in t) e[i] = t[i];
                p();
              },
              setPaused: function () {},
              destroy: function () {
                (clearTimeout(m),
                  v.disconnect(),
                  g.disconnect(),
                  t.classList.remove("orbit--css", "orbit--off"),
                  (t.innerHTML = ""));
              },
            }
          );
        })(t, l);
      (t.classList.add("orbit"), (t.innerHTML = ""));
      var h = 0,
        m = 0,
        u = 1,
        b = 0,
        p = 0,
        f = 0,
        v = document.createElementNS(n, "svg");
      (v.setAttribute("class", "orbit__path"),
        v.setAttribute("aria-hidden", "true"));
      var g = document.createElementNS(n, "ellipse");
      (v.appendChild(g), l.showPath && t.appendChild(v));
      var _ = l.items.map(function (e, i) {
        var r = document.createElement("button");
        return (
          (r.type = "button"),
          (r.className = "orbit__item"),
          r.setAttribute("aria-label", e.label || "Item " + (i + 1)),
          e.label && r.setAttribute("data-label", e.label),
          e.dim && r.setAttribute("data-dim", ""),
          (r.innerHTML = e.html || ""),
          (r.style.boxShadow = "0 8px 22px rgba(0,0,0," + l.shadow + ")"),
          t.appendChild(r),
          { el: r, hover: !1, scale: 1, introAt: 0, front: !1 }
        );
      });
      if (l.centerContent) {
        var w = document.createElement("div");
        ((w.className = "orbit__center"),
          "string" == typeof l.centerContent
            ? (w.innerHTML = l.centerContent)
            : w.appendChild(l.centerContent),
          t.appendChild(w));
      }
      var x = (l.startAngle * Math.PI) / 180,
        y = 1,
        M = 0,
        L = !0,
        A = !0,
        E = 0,
        C = null,
        I = !1;
      function T() {
        ((h = t.clientWidth),
          (m = t.clientHeight),
          (u = l.baseWidth ? h / l.baseWidth : 1));
        var e =
          "ellipse" === l.shape ? [l.radiusX, l.radiusY] : [l.radius, l.radius];
        ((b = e[0] * u), (p = e[1] * u), (f = (l.rotation * Math.PI) / 180));
        var i = Math.max(l.itemSize * u, l.minItemSize || 0);
        (_.forEach(function (t) {
          ((t.el.style.width = i + "px"), (t.el.style.height = i + "px"));
        }),
          v.setAttribute("width", h),
          v.setAttribute("height", m),
          g.setAttribute("cx", h / 2),
          g.setAttribute("cy", m / 2),
          g.setAttribute("rx", b),
          g.setAttribute("ry", p),
          g.setAttribute("stroke-width", l.pathWidth),
          g.setAttribute(
            "stroke-dasharray",
            l.pathDash ? l.pathDash + " " + l.pathDash : "none",
          ),
          g.setAttribute(
            "transform",
            "rotate(" + l.rotation + " " + h / 2 + " " + m / 2 + ")",
          ));
      }
      function k(t) {
        if (h && m)
          for (
            var e = _.length, r = Math.cos(f), n = Math.sin(f), a = 0;
            a < e;
            a++
          ) {
            var o = _[a],
              s = x + (a / e) * i,
              d = b * Math.cos(s),
              c = p * Math.sin(s),
              u = d * r - c * n,
              v = d * n + c * r,
              g = p ? c / p : 0,
              w = 1 + 0.22 * l.depth * g,
              y = o.front ? 1.35 : o.hover ? l.hoverScale : 1;
            ((o.scale += 0.2 * (y - o.scale)),
              Math.abs(y - o.scale) < 0.002 ? (o.scale = y) : !0);
            var M = o.scale * w;
            if (l.depth) {
              var L = (1 - 0.15 * l.depth * (1 - g)).toFixed(3);
              o.op !== L && ((o.op = L), (o.el.style.opacity = L));
            }
            var A =
              "translate3d(" +
              (h / 2 + u).toFixed(2) +
              "px," +
              (m / 2 + v).toFixed(2) +
              "px,0) translate(-50%,-50%) scale(" +
              M.toFixed(3) +
              ")";
            o.tf !== A && ((o.tf = A), (o.el.style.transform = A));
          }
      }
      function S() {
        A && L && (o || document.hidden || (o = requestAnimationFrame(d)));
      }
      var P = {
        run: function (t) {
          var e = E ? Math.min(0.05, (t - E) / 1e3) : 1 / 60;
          ((E = t), (y = l.paused || r ? 0 : I || C ? l.hoverSpeed : 1));
          var n = "reverse" === l.direction ? -1 : 1;
          (C ||
            ((x += n * (i / Math.max(0.1, l.duration)) * y * e),
            (x += M * e),
            (M *= Math.exp(3 * -e)),
            Math.abs(M) < 0.001 && (M = 0)),
            k());
        },
        wanted: function () {
          return A && L && !document.hidden;
        },
      };
      function z(e) {
        var i = t.getBoundingClientRect(),
          r = e.clientX - i.left - i.width / 2,
          n = e.clientY - i.top - i.height / 2,
          a = r * Math.cos(-f) - n * Math.sin(-f),
          o = r * Math.sin(-f) + n * Math.cos(-f);
        return Math.atan2(o / (p || 1), a / (b || 1));
      }
      function F(e) {
        e.detail !== t &&
          _.forEach(function (t) {
            ((t.front = !1), t.el.classList.remove("is-front"));
          });
      }
      (a.push(P),
        document.addEventListener("orbit:front", F),
        _.forEach(function (e) {
          var r = e.el;
          function n(t) {
            var e;
            C &&
              t.pointerId === C.id &&
              (C.moved && ((e = C.vel), (M = Math.min(4, Math.max(-4, e)))),
              (r.__wasDrag = C.moved),
              (C = null));
          }
          (r.addEventListener("pointerenter", function () {
            ((e.hover = !0), (I = !0), S());
          }),
            r.addEventListener("pointerleave", function () {
              ((e.hover = !1),
                (I = _.some(function (t) {
                  return t.hover;
                })));
            }),
            r.addEventListener("pointerdown", function (t) {
              if (l.draggable && !(t.button > 0)) {
                ((C = {
                  id: t.pointerId,
                  startX: t.clientX,
                  startY: t.clientY,
                  angle: z(t),
                  moved: !1,
                  lastT: performance.now(),
                  vel: 0,
                }),
                  (M = 0));
                try {
                  r.setPointerCapture(t.pointerId);
                } catch (t) {}
              }
            }),
            r.addEventListener("pointermove", function (t) {
              if (
                C &&
                t.pointerId === C.id &&
                (!C.moved &&
                  Math.hypot(t.clientX - C.startX, t.clientY - C.startY) > 5 &&
                  (C.moved = !0),
                C.moved)
              ) {
                var e = z(t),
                  r = e - C.angle;
                (r > Math.PI && (r -= i),
                  r < -Math.PI && (r += i),
                  (C.angle = e),
                  (x += r));
                var n = performance.now(),
                  a = Math.max(1, n - C.lastT) / 1e3;
                ((C.vel = 0.6 * C.vel + (r / a) * 0.4), (C.lastT = n));
              }
            }),
            r.addEventListener("pointerup", n),
            r.addEventListener("pointercancel", n),
            r.addEventListener("click", function () {
              if (r.__wasDrag) r.__wasDrag = !1;
              else if (l.clickToFront) {
                var i,
                  n = e.front;
                ((i = t),
                  document.dispatchEvent(
                    new CustomEvent("orbit:front", { detail: i }),
                  ),
                  _.forEach(function (t) {
                    ((t.front = !1), t.el.classList.remove("is-front"));
                  }),
                  n || ((e.front = !0), r.classList.add("is-front")),
                  S());
              }
            }));
        }));
      var D = new ResizeObserver(function () {
        (T(), k(performance.now()), S());
      });
      D.observe(t);
      var H = new IntersectionObserver(
        function (t) {
          var e = t.some(function (t) {
            return t.isIntersecting;
          });
          ((L = e), e && ((E = 0), S()));
        },
        { threshold: 0.15 },
      );
      function N() {
        ((E = 0), S());
      }
      return (
        H.observe(t),
        document.addEventListener("visibilitychange", N),
        T(),
        k(performance.now()),
        S(),
        {
          update: function (t) {
            for (var e in t) l[e] = t[e];
            (T(), k(performance.now()), S());
          },
          setPaused: function (t) {
            ((l.paused = !!t), S());
          },
          destroy: function () {
            A = !1;
            var e = a.indexOf(P);
            (e > -1 && a.splice(e, 1),
              D.disconnect(),
              H.disconnect(),
              document.removeEventListener("visibilitychange", N),
              document.removeEventListener("orbit:front", F),
              (t.innerHTML = ""));
          },
        }
      );
    };
  }
  function d(t) {
    o = 0;
    for (var e = !1, i = 0; i < a.length; i++)
      a[i].wanted() && ((e = !0), a[i].run(t));
    e && (o = requestAnimationFrame(d));
  }
})();
