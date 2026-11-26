!(function () {
  var e,
    t = document.getElementById("heroLoadBar");
  if (
    ((window.siteLoaderReady = new Promise(function (t) {
      e = t;
    })),
    t)
  ) {
    var n = t.querySelector(".hero-loadbar__fill"),
      o = t,
      r = t.querySelector(".hero-loadbar__pct"),
      a = t.querySelector(".hero-loadbar__bike"),
      i = { dom: 20, font: 20, img: 25, load: 35 },
      d = { dom: !1, font: !1, img: !1, load: !1 },
      u = performance.now(),
      c = u,
      f = 6,
      m = 0,
      l = !1;
    ("loading" !== document.readyState
      ? v("dom")
      : document.addEventListener("DOMContentLoaded", function () {
          v("dom");
        }),
      document.fonts && document.fonts.load
        ? document.fonts.load("italic 700 1em PortfolioSerif").then(
            function () {
              v("font");
            },
            function () {
              v("font");
            },
          )
        : v("font"));
    var s = new Image();
    ((s.onload = s.onerror =
      function () {
        v("img");
      }),
      (s.src = "index.webp"),
      s.complete && v("img"),
      "complete" === document.readyState
        ? v("load")
        : window.addEventListener("load", function () {
            v("load");
          }),
      setTimeout(function () {
        for (var e in d) d[e] = !0;
        h();
      }, 8e3),
      requestAnimationFrame(function (e) {
        ((c = e), p(e));
      }));
  } else e();
  function h() {
    var e = 0;
    for (var t in d) d[t] && (e += i[t]);
    e > f && (f = e);
  }
  function v(e) {
    d[e] || ((d[e] = !0), h());
  }
  function w() {
    for (var e in d) if (!d[e]) return !1;
    return !0;
  }
  function S() {
    ((n.style.clipPath = "inset(0 " + (100 - m) + "% 0 0 round 999px)"),
      window.heroScrambleSet && window.heroScrambleSet(m / 100),
      r && (r.textContent = Math.round(m) + "%"),
      a &&
        ((a.style.left = m + "%"),
        (a.style.transform = "translateX(-" + m + "%)")),
      o.setAttribute("aria-valuenow", String(Math.round(m))));
  }
  function p(n) {
    if (!l) {
      var o = Math.min(64, n - c);
      c = n;
      var r = w() ? 100 : Math.min(92, f + 10);
      ((r = Math.min(r, ((n - u) / 2900) * 100)),
        (m += (r - m) * (1 - Math.exp(-o / 260))) > 99.4 &&
          r >= 100 &&
          (m = 100),
        S(),
        m >= 100 && w()
          ? l ||
            ((l = !0),
            (m = 100),
            S(),
            setTimeout(function () {
              t.classList.add("is-done");
              var n = !1;
              function o() {
                n ||
                  ((n = !0), t.parentNode && t.parentNode.removeChild(t), e());
              }
              (t.addEventListener("transitionend", function (e) {
                e.target === t && o();
              }),
                setTimeout(o, 450));
            }, 250))
          : requestAnimationFrame(p));
    }
  }
})();
// Thick golden border for the loading bar
(function () {
  var track = document.querySelector("#heroLoadBar .hero-loadbar__track");
  if (!track) return;

  var set = function (prop, val) {
    track.style.setProperty(prop, val, "important");
  };

  set("height", "16px");
  set("border", "3px solid transparent");
  set(
    "background",
    "linear-gradient(rgba(120,120,130,0.18), rgba(120,120,130,0.18)) padding-box, " +
      "linear-gradient(135deg, #955811, #e0af22 30%, #ffdd58 50%, #c7910f 70%, #e0af22) border-box",
  );
  set(
    "box-shadow",
    "inset 0 1px 2px rgba(0,0,0,0.25), 0 0 10px rgba(224,175,34,0.45)",
  );
  set("filter", "none");
})();
