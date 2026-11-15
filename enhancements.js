function rcQR(e) {
  var r,
    t,
    a = [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
    o = [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
    i = unescape(encodeURIComponent(e))
      .split("")
      .map(function (e) {
        return e.charCodeAt(0);
      });
  function n(e) {
    var r = (16 * e + 128) * e + 64;
    if (e >= 2) {
      var t = Math.floor(e / 7) + 2;
      ((r -= (25 * t - 10) * t - 55), e >= 7 && (r -= 36));
    }
    return r;
  }
  for (
    r = 1;
    r <= 10 &&
    ((t = Math.floor(n(r) / 8) - a[r] * o[r]),
    !(i.length + (r < 10 ? 2 : 3) <= t));
    r++
  );
  if (r > 10) return null;
  var c = [];
  function s(e, r) {
    for (var t = r - 1; t >= 0; t--) c.push((e >>> t) & 1);
  }
  for (
    s(4, 4),
      s(i.length, r < 10 ? 8 : 16),
      i.forEach(function (e) {
        s(e, 8);
      }),
      s(0, Math.min(4, 8 * t - c.length));
    c.length % 8;
  )
    c.push(0);
  for (var l = 236; c.length < 8 * t; l ^= 253) s(l, 8);
  for (var d = [], h = 0; h < c.length; h += 8) {
    for (var f = 0, p = 0; p < 8; p++) f = (f << 1) | c[h + p];
    d.push(f);
  }
  function v(e, r) {
    for (var t = 0, a = 7; a >= 0; a--)
      ((t = (t << 1) ^ (285 * (t >>> 7))), (t ^= ((r >>> a) & 1) * e));
    return t;
  }
  var u,
    g = a[r],
    m = [];
  for (h = 0; h < g - 1; h++) m.push(0);
  m.push(1);
  var y = 1;
  for (h = 0; h < g; h++) {
    for (u = 0; u < g; u++)
      ((m[u] = v(m[u], y)), u + 1 < g && (m[u] ^= m[u + 1]));
    y = v(y, 2);
  }
  function b(e) {
    var r = m.map(function () {
      return 0;
    });
    return (
      e.forEach(function (e) {
        var t = e ^ r.shift();
        (r.push(0),
          m.forEach(function (e, a) {
            r[a] ^= v(e, t);
          }));
      }),
      r
    );
  }
  var k = o[r],
    w = Math.floor(n(r) / 8),
    x = k - (w % k),
    M = Math.floor(w / k),
    E = [],
    L = 0;
  for (h = 0; h < k; h++) {
    var C = d.slice(L, L + M - g + (h < x ? 0 : 1));
    L += C.length;
    var A = b(C);
    (h < x && C.push(0), E.push(C.concat(A)));
  }
  var S = [];
  for (h = 0; h < E[0].length; h++)
    E.forEach(function (e, r) {
      (h != M - g || r >= x) && S.push(e[h]);
    });
  var j = 4 * r + 17,
    R = [],
    I = [];
  for (h = 0; h < j; h++)
    (R.push(new Array(j).fill(!1)), I.push(new Array(j).fill(!1)));
  function B(e, r, t) {
    ((R[r][e] = t), (I[r][e] = !0));
  }
  for (h = 0; h < j; h++) (B(6, h, h % 2 == 0), B(h, 6, h % 2 == 0));
  function N(e, r) {
    for (var t = -4; t <= 4; t++)
      for (var a = -4; a <= 4; a++) {
        var o = Math.max(Math.abs(a), Math.abs(t)),
          i = e + a,
          n = r + t;
        i >= 0 && i < j && n >= 0 && n < j && B(i, n, 2 != o && 4 != o);
      }
  }
  (N(3, 3), N(j - 4, 3), N(3, j - 4));
  var O = [];
  if (r > 1) {
    var T = Math.floor(r / 7) + 2,
      q = 2 * Math.ceil((4 * r + 4) / (2 * T - 2));
    O = [6];
    for (var D = j - 7; O.length < T; D -= q) O.splice(1, 0, D);
    for (h = 0; h < T; h++)
      for (u = 0; u < T; u++)
        if (
          !(
            (0 == h && 0 == u) ||
            (0 == h && u == T - 1) ||
            (h == T - 1 && 0 == u)
          )
        )
          for (var z = -2; z <= 2; z++)
            for (var P = -2; P <= 2; P++)
              B(O[h] + P, O[u] + z, 1 != Math.max(Math.abs(P), Math.abs(z)));
  }
  function V(e, r) {
    return !!((e >>> r) & 1);
  }
  function H(e) {
    for (var r = 8 | e, t = r, a = 0; a < 10; a++)
      t = (t << 1) ^ (1335 * (t >>> 9));
    var o = 21522 ^ ((r << 10) | t);
    for (a = 0; a <= 5; a++) B(8, a, V(o, a));
    for (
      B(8, 7, V(o, 6)), B(8, 8, V(o, 7)), B(7, 8, V(o, 8)), a = 9;
      a < 15;
      a++
    )
      B(14 - a, 8, V(o, a));
    for (a = 0; a < 8; a++) B(j - 1 - a, 8, V(o, a));
    for (a = 8; a < 15; a++) B(8, j - 15 + a, V(o, a));
    B(8, j - 8, !0);
  }
  if ((H(0), r >= 7)) {
    var U = r;
    for (h = 0; h < 12; h++) U = (U << 1) ^ (7973 * (U >>> 11));
    var F = (r << 12) | U;
    for (h = 0; h < 18; h++) {
      var Y = V(F, h),
        G = j - 11 + (h % 3),
        Q = Math.floor(h / 3);
      (B(G, Q, Y), B(Q, G, Y));
    }
  }
  for (var W = 0, _ = j - 1; _ >= 1; _ -= 2) {
    6 == _ && (_ = 5);
    for (var J = 0; J < j; J++)
      for (u = 0; u < 2; u++) {
        var K = _ - u,
          Z = (_ + 1) & 2 ? J : j - 1 - J;
        !I[Z][K] &&
          W < 8 * S.length &&
          ((R[Z][K] = V(S[W >>> 3], 7 - (7 & W))), W++);
      }
  }
  function $(e) {
    for (var r = 0; r < j; r++)
      for (var t = 0; t < j; t++) {
        var a;
        switch (e) {
          case 0:
            a = (t + r) % 2 == 0;
            break;
          case 1:
            a = r % 2 == 0;
            break;
          case 2:
            a = t % 3 == 0;
            break;
          case 3:
            a = (t + r) % 3 == 0;
            break;
          case 4:
            a = (Math.floor(t / 3) + Math.floor(r / 2)) % 2 == 0;
            break;
          case 5:
            a = ((t * r) % 2) + ((t * r) % 3) == 0;
            break;
          case 6:
            a = (((t * r) % 2) + ((t * r) % 3)) % 2 == 0;
            break;
          default:
            a = (((t + r) % 2) + ((t * r) % 3)) % 2 == 0;
        }
        !I[r][t] && a && (R[r][t] = !R[r][t]);
      }
  }
  function X() {
    for (var e, r, t, a = 0, o = 0, i = 0; i < 2; i++)
      for (e = 0; e < j; e++)
        for (t = 1, r = 1; r < j; r++)
          (i ? R[r][e] : R[e][r]) == (i ? R[r - 1][e] : R[e][r - 1])
            ? 5 == ++t
              ? (a += 3)
              : t > 5 && a++
            : (t = 1);
    for (e = 0; e < j - 1; e++)
      for (r = 0; r < j - 1; r++)
        R[e][r] == R[e][r + 1] &&
          R[e][r] == R[e + 1][r] &&
          R[e][r] == R[e + 1][r + 1] &&
          (a += 3);
    for (e = 0; e < j; e++) for (r = 0; r < j; r++) R[e][r] && o++;
    return a + 10 * Math.floor(Math.abs(20 * o - j * j * 10) / (j * j));
  }
  for (var ee = 0, re = 1e9, te = 0; te < 8; te++) {
    ($(te), H(te));
    var ae = X();
    (ae < re && ((re = ae), (ee = te)), $(te));
  }
  return ($(ee), H(ee), R);
}
(!(function () {
  var e = document.documentElement,
    r = "rajesh-theme-v2";
  function t(t) {
    e.setAttribute("data-theme", t);
    try {
      localStorage.setItem(r, t);
    } catch (e) {}
    var a = document.getElementById("themeToggle");
    a &&
      a.setAttribute(
        "aria-label",
        "dark" === t ? "Switch to light theme" : "Switch to dark theme",
      );
  }
  (e.setAttribute(
    "data-theme",
    (function () {
      try {
        return localStorage.getItem(r);
      } catch (e) {
        return null;
      }
    })() || "light",
  ),
    document.addEventListener("DOMContentLoaded", function () {
      var r = function (e, r) {
          return (r || document).querySelector(e);
        },
        a = r("#navbar"),
        o = r("#mobileMenuIcon"),
        i = document.createElement("button");
      ((i.id = "themeToggle"),
        (i.className = "theme-toggle"),
        (i.type = "button"),
        (i.innerHTML =
          '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'),
        a.insertBefore(i, o),
        i.addEventListener("click", function () {
          t("dark" === e.getAttribute("data-theme") ? "light" : "dark");
        }),
        t(e.getAttribute("data-theme")));
      var n = document.createElement("div");
      n.className = "scroll-progress";
      var c = document.createElement("button");
      ((c.className = "to-top"),
        (c.type = "button"),
        c.setAttribute("aria-label", "Back to top"),
        (c.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M12 5L6 11M12 5l6 6" /></svg>'),
        document.body.append(n, c),
        c.addEventListener("click", function () {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }),
        window.addEventListener(
          "scroll",
          function () {
            var e = document.documentElement.scrollHeight - innerHeight;
            ((n.style.width = (e > 0 ? (scrollY / e) * 100 : 0) + "%"),
              c.classList.toggle("show", scrollY > 700));
          },
          { passive: !0 },
        ));
      var s = document.createElement("style");
      ((s.textContent =
        "html .e-card.cert-card{border:3px solid #e0af22!important;box-shadow:0 0 0 1px rgba(255,221,88,.5),0 10px 30px rgba(224,175,34,.25)!important;padding:0!important;margin:0;overflow:hidden;display:block;position:relative;aspect-ratio:7/5;min-height:0;line-height:0;border-radius:1.25rem}html .e-card.cert-card img{position:absolute;inset:0;display:block;width:100%;height:100%;margin:0;padding:0;border:0;object-fit:cover;object-position:center;background:none;transition:transform .5s ease}.e-card.cert-card iframe{position:absolute;inset:0;display:block;width:100%;height:100%;border:0;pointer-events:none;background:#fff}.e-card.cert-card:hover img{transform:scale(1.04)}.e-card.cert-card.cert-missing{display:grid;place-items:center;padding:1rem!important;text-align:center;font-size:.85rem;line-height:1.5;opacity:.75}@media(max-width:768px){#highlights.extra{padding-left:0!important;padding-right:0!important}#highlights .extra-inner{padding-left:1.25rem!important;padding-right:1.25rem!important}#highlights .e-grid{padding-left:1.25rem!important;padding-right:1.25rem!important;gap:1.25rem!important}#highlights .extra-title{font-size:clamp(1.8rem,8vw,2.5rem)!important;line-height:1.1}}"),
        document.head.appendChild(s));
      for (var l = r("#project"), d = "", h = 1; h <= 4; h++)
        d +=
          '<div class="e-card cert-card"><img src="certificate' +
          h +
          '.webp" alt="Certificate ' +
          h +
          '" width="1287" height="910" loading="lazy" decoding="async" draggable="false" /></div>';
      var f = document.createElement("section");
      if (
        ((f.id = "highlights"),
        (f.className = "extra"),
        (f.innerHTML =
          '<div class="extra-inner"><div class="journey-header sec-head"><span class="journey-title">Certificates</span></div><div class="e-grid">' +
          d +
          "</div></div>"),
        l.parentNode.insertBefore(f, l),
        document.querySelectorAll(".project-item").forEach(function (e) {
          e.classList.add("e-reveal");
        }),
        "IntersectionObserver" in window)
      ) {
        var p = new IntersectionObserver(
          function (e) {
            e.forEach(function (e) {
              if (e.isIntersecting) {
                (e.target.classList.add("in"), p.unobserve(e.target));
                var r = e.target.querySelector("[data-count]");
                if (r)
                  var t = +r.dataset.count,
                    a = 0,
                    o = setInterval(function () {
                      (a++, (r.textContent = a), a >= t && clearInterval(o));
                    }, 350 / t);
              }
            });
          },
          { threshold: 0.15 },
        );
        document.querySelectorAll(".e-reveal").forEach(function (e) {
          p.observe(e);
        });
      } else
        document.querySelectorAll(".e-reveal").forEach(function (e) {
          e.classList.add("in");
        });
      var v = document.querySelectorAll(".navbar-links a[href^='#']");
      if ("IntersectionObserver" in window) {
        var u = new IntersectionObserver(
          function (e) {
            e.forEach(function (e) {
              e.isIntersecting &&
                v.forEach(function (r) {
                  r.classList.toggle(
                    "active",
                    r.getAttribute("href") === "#" + e.target.id,
                  );
                });
            });
          },
          { rootMargin: "-45% 0px -50% 0px" },
        );
        ["home", "about", "service", "project", "contact"].forEach(
          function (e) {
            var r = document.getElementById(e);
            r && u.observe(r);
          },
        );
      }
      var g = r("#contactForm");
      if (g) {
        var m = document.createElement("p");
        ((m.className = "form-status"),
          m.setAttribute("role", "status"),
          g.appendChild(m),
          g.addEventListener(
            "submit",
            function (e) {
              (e.preventDefault(), e.stopImmediatePropagation());
              var r = g.querySelectorAll("input,textarea"),
                t = r[0].value.trim(),
                a = r[1].value.trim(),
                o = r[2].value.trim();
              if (!t || !/^\S+@\S+\.\S+$/.test(a) || o.length < 5)
                return (
                  (m.className = "form-status err"),
                  void (m.textContent =
                    "Please enter your name, a valid email and a short message.")
                );
              var i = o + "\n\n— " + t + " (" + a + ")";
              ((window.location.href =
                "mailto:rajeshs18022006@gmail.com?subject=" +
                encodeURIComponent("Portfolio enquiry from " + t) +
                "&body=" +
                encodeURIComponent(i)),
                (m.className = "form-status ok"),
                (m.textContent = "Opening your email app… thank you!"),
                g.reset());
            },
            !0,
          ));
      }
    }));
})(),
  document.addEventListener("DOMContentLoaded", function () {
    var e = document.querySelector(".footer-card-section");
    if (e) {
      var r,
        t = {
          mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
          tel: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
          gh: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>',
          li: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
          wa: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.4A8.5 8.5 0 1 1 21 11.5z"/>',
        },
        a = [];
      for (r = 0; r < 80; r++) {
        var o = r % 2 ? 84 : 95,
          i = (Math.PI * r) / 40 - Math.PI / 2;
        a.push(
          (100 + o * Math.cos(i)).toFixed(1) +
            "," +
            (100 + o * Math.sin(i)).toFixed(1),
        );
      }
      var n =
          '<svg class="rc-corner" viewBox="0 0 60 60" fill="none" stroke="url(#rcg)" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 56V26C4 13 13 4 26 4h30"/><path d="M11 56V30c0-10 9-19 19-19h26"/><path d="M17 17c7 0 11 4 11 10s-5 9-9 7"/><circle cx="12" cy="12" r="2.4" fill="url(#rcg)"/></svg>',
        c =
          "BEGIN:VCARD\nVERSION:3.0\nFN:Rajesh S\nTITLE:MERN Stack Developer\nTEL;TYPE=CELL:+919025461022\nEMAIL:rajeshs18022006@gmail.com\nURL:https://github.com/Rajesh006-jerry\nEND:VCARD",
        s = rcQR(c),
        l = "";
      if (s) {
        var d = s.length,
          h = "";
        (s.forEach(function (e, r) {
          e.forEach(function (e, t) {
            e && (h += "M" + t + " " + r + "h1v1h-1z");
          });
        }),
          (l =
            '<svg viewBox="-2 -2 ' +
            (d + 4) +
            " " +
            (d + 4) +
            '" shape-rendering="crispEdges" role="img" aria-label="QR code with Rajesh S contact details"><rect x="-2" y="-2" width="' +
            (d + 4) +
            '" height="' +
            (d + 4) +
            '" fill="#fff"/><path d="' +
            h +
            '" fill="#0a0a0a"/></svg>'));
      }
      ((e.innerHTML =
        '<div class="gc-wrap"><div class="rc" id="goldCard"><div class="rc-in"><svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="rcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset=".3" stop-color="#e6b93c"/><stop offset=".6" stop-color="#a67c00"/><stop offset=".82" stop-color="#f6dc7a"/><stop offset="1" stop-color="#b8860b"/></linearGradient></defs></svg><svg class="rc-m-art" viewBox="0 0 360 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect class="rc-m-bg" width="360" height="230"/><circle cx="-25" cy="115" r="92" fill="url(#rcg)"/><circle cx="-25" cy="115" r="76" fill="none" stroke="#0a0a0a" stroke-opacity=".35" stroke-width="1.5"/><polygon points="55,0 135,0 360,160 360,215" fill="url(#rcg)"/><polygon points="135,0 190,0 360,122 360,160" class="rc-band"/><polygon points="190,0 206,0 360,110 360,122" fill="url(#rcg)"/><polygon points="206,0 222,0 360,98 360,110" class="rc-band"/><path d="M0 205 L250 0" stroke="url(#rcg)" stroke-width="1" opacity=".7"/><path d="M0 225 L270 6" stroke="url(#rcg)" stroke-width="1" opacity=".45"/><path d="M222 0 L360 92 V98 L216 0Z" fill="url(#rcg)" opacity=".5"/><circle cx="60" cy="40" r="2.5" fill="url(#rcg)"/><circle cx="82" cy="58" r="1.6" fill="url(#rcg)"/><circle cx="290" cy="30" r="2" fill="url(#rcg)"/><circle cx="-25" cy="115" r="62" fill="none" stroke="#0a0a0a" stroke-opacity=".3" stroke-width="1" stroke-dasharray="2 4"/><circle cx="330" cy="215" r="62" fill="none" stroke="url(#rcg)" stroke-width="1.5"/><circle cx="330" cy="215" r="50" fill="none" stroke="url(#rcg)" stroke-width="1" stroke-dasharray="2 4"/></svg><span class="rc-f1"></span><span class="rc-d t"></span><span class="rc-d b"></span><span class="rc-d l"></span><span class="rc-d r"></span><span class="rc-sp s1"></span><span class="rc-sp s2"></span><span class="rc-sp s3"></span><span class="rc-sp s4"></span><span class="rc-sp s5"></span><svg class="rc-rings" viewBox="0 0 200 200" fill="none" stroke="url(#rcg)" aria-hidden="true"><circle cx="100" cy="100" r="96" stroke-width="1"/><circle cx="100" cy="100" r="82" stroke-width="1.4" stroke-dasharray="1 5" stroke-linecap="round"/><circle cx="100" cy="100" r="68" stroke-width="1"/><circle cx="100" cy="100" r="54" stroke-width="1.4" stroke-dasharray="2 4"/><circle cx="100" cy="100" r="40" stroke-width="1"/></svg><svg class="rc-m-foot" viewBox="0 0 360 80" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,80 0,28 150,80" fill="url(#rcg)"/><polygon points="0,80 0,52 76,80" class="rc-band"/><polygon points="360,80 360,40 240,80" fill="url(#rcg)"/><polygon points="360,80 360,60 300,80" class="rc-band"/></svg><span class="rc-c tl">' +
        n +
        '</span><span class="rc-c tr">' +
        n +
        '</span><span class="rc-c bl">' +
        n +
        '</span><span class="rc-c br">' +
        n +
        '</span><div class="rc-badge"><div class="rc-hang"><i></i><i></i></div><svg class="rc-ribbon" viewBox="0 0 200 280" aria-hidden="true"><polygon points="52,150 108,168 84,272 66,248 36,258" fill="url(#rcg)"/><polygon points="148,150 92,168 116,272 134,248 164,258" fill="url(#rcg)" opacity=".9"/></svg><svg class="rc-seal" viewBox="0 0 200 200" aria-label="RS monogram"><polygon points="' +
        a.join(" ") +
        '" fill="url(#rcg)"/><circle cx="100" cy="100" r="79" fill="none" stroke="#5a4100" stroke-opacity=".5" stroke-width="1.6" stroke-dasharray="1 5" stroke-linecap="round"/><circle cx="100" cy="100" r="72" fill="none" stroke="#5a4100" stroke-opacity=".55" stroke-width="3"/><circle cx="100" cy="100" r="64" fill="none" stroke="#fff6c8" stroke-opacity=".6" stroke-width="1.5"/><text x="100" y="112" text-anchor="middle" font-size="60" font-weight="900" font-family="Georgia,serif" fill="#2e2100">RS</text><text x="100" y="146" text-anchor="middle" font-size="17" letter-spacing="7" fill="#2e2100">★★★</text></svg></div><div class="rc-divider"></div><div class="rc-main"><div class="rc-head"><div class="rc-eyebrow">PORTFOLIO</div><div class="rc-sub">of a MERN Stack Developer</div><div class="rc-flourish"><i></i><b></b><i></i></div></div><div class="rc-id"><div class="rc-pre">Proudly presented by</div><div class="rc-name">RAJESH S</div><div class="rc-pos">MERN Stack Developer</div><div class="rc-meta"><b>BCA</b> · University of Madras · Tamil · English</div></div><div class="rc-low"><div class="rc-lowl"><div class="rc-list">' +
        f(
          "mailto:rajeshs18022006@gmail.com",
          "rajeshs18022006@gmail.com",
          "mail",
        ) +
        f("tel:+919025461022", "+91 90254 61022", "tel") +
        f(
          "https://github.com/Rajesh006-jerry",
          "github.com/Rajesh006-jerry",
          "gh",
          1,
        ) +
        f(
          "https://www.linkedin.com/in/rajesh-s-a58a342a8",
          "linkedin.com/in/rajesh-s-a58a342a8",
          "li",
          1,
        ) +
        f(
          "https://wa.me/919025461022?text=Hi%20Rajesh%20S",
          "Chat on WhatsApp",
          "wa",
          1,
        ) +
        '</div><div class="rc-actions"><button type="button" class="rc-btn fill" id="saveContact">↓ Save Contact</button><a class="rc-btn line" href="mailto:rajeshs18022006@gmail.com">Let’s Connect ↗</a></div></div><div class="rc-qr"><div class="rc-qrbox">' +
        l +
        '</div><span>SCAN TO SAVE CONTACT</span></div></div><span class="rc-avail"><i></i>OPEN TO WORK</span></div></div></div><p class="gc-copy">© ' +
        new Date().getFullYear() +
        " Rajesh S — MERN Stack Developer</p></div>"),
        document
          .getElementById("saveContact")
          .addEventListener("click", function () {
            var e = document.createElement("a");
            ((e.href = URL.createObjectURL(
              new Blob([c], { type: "text/vcard" }),
            )),
              (e.download = "Rajesh_S.vcf"),
              document.body.appendChild(e),
              e.click(),
              e.remove());
          }));
    }
    function f(e, r, a, o) {
      return (
        '<a class="rc-row" href="' +
        e +
        '"' +
        (o ? ' target="_blank" rel="noopener noreferrer"' : "") +
        ">" +
        (function (e) {
          return (
            '<i class="rc-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            t[e] +
            "</svg></i>"
          );
        })(a) +
        "<span>" +
        r +
        "</span></a>"
      );
    }
  }));
