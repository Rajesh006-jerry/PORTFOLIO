(function () {
  var root = document.documentElement,
    KEY = "rajesh-theme-v2";
  function saved() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }
  function apply(t) {
    root.setAttribute("data-theme", t);
    try {
      localStorage.setItem(KEY, t);
    } catch (e) {}
    var b = document.getElementById("themeToggle");
    if (b)
      b.setAttribute(
        "aria-label",
        t === "dark" ? "Switch to light theme" : "Switch to dark theme",
      );
  }
  root.setAttribute("data-theme", saved() || "light"); // runs immediately: no flash

  document.addEventListener("DOMContentLoaded", function () {
    var $ = function (s, c) {
      return (c || document).querySelector(s);
    };

    // 1. Theme toggle button
    var nav = $("#navbar"),
      menuIcon = $("#mobileMenuIcon");
    var btn = document.createElement("button");
    btn.id = "themeToggle";
    btn.className = "theme-toggle";
    btn.type = "button";
    btn.innerHTML =
      '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>' +
      '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    nav.insertBefore(btn, menuIcon);
    btn.addEventListener("click", function () {
      apply(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
    apply(root.getAttribute("data-theme"));

    // 2. Progress bar + back to top
    var bar = document.createElement("div");
    bar.className = "scroll-progress";
    var top = document.createElement("button");
    top.className = "to-top";
    top.type = "button";
    top.setAttribute("aria-label", "Back to top");
    top.textContent = "↑";
    document.body.append(bar, top);
    top.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener(
      "scroll",
      function () {
        var h = document.documentElement.scrollHeight - innerHeight;
        bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
        top.classList.toggle("show", scrollY > 700);
      },
      { passive: true },
    );

    // 3. Certificates
    //    Finds certificate1..4, checks it is a real file, and fills each card
    //    edge-to-edge. PDFs are rendered to an image (no toolbar, no gaps).
    var CERT_COUNT = 4;
    var CERT_EXTS = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".pdf",
      ".JPG",
      ".JPEG",
      ".PNG",
      ".WEBP",
      ".PDF",
    ];
    var PDFJS_SRC =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    var PDFJS_WORKER =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    function certCandidates(n) {
      var bases = [
        "certificate" + n,
        "Certificate" + n,
        "certificate-" + n,
        "certificate_" + n,
        "certificate " + n,
        "Certificate " + n,
      ];
      var urls = [];
      bases.forEach(function (b) {
        CERT_EXTS.forEach(function (e) {
          urls.push(encodeURI(b + e));
        });
      });
      return urls;
    }

    // Identify the real file type from its first bytes
    function sniff(buf) {
      var b = new Uint8Array(buf);
      if (!b.length) return "empty";
      if (b[0] === 0xff && b[1] === 0xd8) return "image"; // JPEG
      if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
        return "image"; // PNG
      if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image"; // GIF
      if (
        b[0] === 0x52 &&
        b[1] === 0x49 &&
        b[2] === 0x46 &&
        b[3] === 0x46 &&
        b[8] === 0x57 &&
        b[9] === 0x45
      )
        return "image"; // WebP
      if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46)
        return "pdf";
      if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
        var brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
        if (brand === "avif") return "image";
        return "heic";
      }
      if (b[0] === 0x3c) return "html";
      return "unknown";
    }

    // Load pdf.js once (only when a PDF is found)
    var pdfJsPromise = null;
    function loadPdfJs() {
      if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
      if (pdfJsPromise) return pdfJsPromise;
      pdfJsPromise = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = PDFJS_SRC;
        s.onload = function () {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
          resolve(window.pdfjsLib);
        };
        s.onerror = reject;
        document.head.appendChild(s);
      });
      return pdfJsPromise;
    }

    // Render page 1 of a PDF to a JPEG data URL
    function pdfToImage(buf) {
      return loadPdfJs()
        .then(function (lib) {
          return lib.getDocument({ data: new Uint8Array(buf) }).promise;
        })
        .then(function (pdf) {
          return pdf.getPage(1);
        })
        .then(function (page) {
          var vp = page.getViewport({ scale: 2.5 });
          var canvas = document.createElement("canvas");
          canvas.width = Math.floor(vp.width);
          canvas.height = Math.floor(vp.height);
          return page
            .render({ canvasContext: canvas.getContext("2d"), viewport: vp })
            .promise.then(function () {
              return canvas.toDataURL("image/jpeg", 0.92);
            });
        });
    }

    // Fallback when fetch() is not allowed (for example opening via file://)
    function tryImage(u) {
      return new Promise(function (resolve) {
        var im = new Image();
        im.onload = function () {
          resolve({ url: u, kind: "image" });
        };
        im.onerror = function () {
          resolve(null);
        };
        im.src = u;
      });
    }

    function checkOne(u) {
      return fetch(u, { cache: "no-store" })
        .then(function (res) {
          if (!res.ok) return null;
          return res.arrayBuffer().then(function (buf) {
            var kind = sniff(buf.slice(0, 16));
            if (kind === "html") return null;
            if (kind === "pdf") {
              return pdfToImage(buf)
                .then(function (dataUrl) {
                  return { url: dataUrl, kind: "image" };
                })
                .catch(function () {
                  // pdf.js could not load: fall back to an embedded viewer
                  var blob = new Blob([buf], { type: "application/pdf" });
                  return { url: URL.createObjectURL(blob), kind: "pdf" };
                });
            }
            return { url: u, kind: kind };
          });
        })
        .catch(function () {
          return tryImage(u);
        });
    }

    function findCert(n) {
      var urls = certCandidates(n);
      return new Promise(function (resolve) {
        var i = 0,
          problem = null;
        (function next() {
          if (i >= urls.length) return resolve(problem);
          checkOne(urls[i++]).then(function (r) {
            if (!r) return next();
            if (r.kind === "image" || r.kind === "pdf") return resolve(r);
            problem = problem || r;
            next();
          });
        })();
      });
    }

    function certMessage(n, r) {
      var f = "certificate" + n + ".jpg";
      if (!r) return f + " not found. Put it in the same folder as index.html.";
      if (r.kind === "empty")
        return f + " is an empty (0 byte) file. Copy the original again.";
      if (r.kind === "heic")
        return (
          f +
          " is a HEIC photo renamed to .jpg. Convert it to a real JPG or PNG."
        );
      return f + " is not a valid image. Re-export it as JPG or PNG.";
    }

    var cs = document.createElement("style");
    cs.textContent =
      "html .e-card.cert-card{border:3px solid #e0af22!important;box-shadow:0 0 0 1px rgba(255,221,88,.5),0 10px 30px rgba(224,175,34,.25)!important;padding:0!important;margin:0;overflow:hidden;display:block;position:relative;aspect-ratio:7/5;min-height:0;line-height:0;border-radius:1.25rem}" +
      "html .e-card.cert-card img{position:absolute;inset:0;display:block;width:100%;height:100%;margin:0;padding:0;border:0;object-fit:cover;object-position:center;background:none;transition:transform .5s ease}" +
      ".e-card.cert-card iframe{position:absolute;inset:0;display:block;width:100%;height:100%;border:0;pointer-events:none;background:#fff}" +
      ".e-card.cert-card:hover img{transform:scale(1.04)}" +
      ".e-card.cert-card.cert-missing{display:grid;place-items:center;padding:1rem!important;text-align:center;font-size:.85rem;line-height:1.5;opacity:.75}";
    document.head.appendChild(cs);

    var proj = $("#project");
    var finders = [];
    for (var n = 1; n <= CERT_COUNT; n++) finders.push(findCert(n));

    Promise.all(finders).then(function (found) {
      var cards = found
        .map(function (r, i) {
          var num = i + 1;
          if (r && r.kind === "image")
            return (
              '<div class="e-card cert-card"><img src="' +
              r.url +
              '" alt="Certificate ' +
              num +
              '" decoding="async" draggable="false" /></div>'
            );
          if (r && r.kind === "pdf")
            return (
              '<div class="e-card cert-card"><iframe src="' +
              r.url +
              '#toolbar=0&navpanes=0&scrollbar=0&view=Fit" title="Certificate ' +
              num +
              '"></iframe></div>'
            );
          return (
            '<div class="e-card cert-card cert-missing">' +
            certMessage(num, r) +
            "</div>"
          );
        })
        .join("");

      var sec = document.createElement("section");
      sec.id = "highlights";
      sec.className = "extra";
      sec.innerHTML =
        '<div class="extra-inner">' +
        '<p class="extra-eyebrow">Achievements</p><h2 class="extra-title">My Certificates</h2>' +
        '<div class="e-grid">' +
        cards +
        "</div></div>";
      proj.parentNode.insertBefore(sec, proj);
    });

    // 4. Reveal on scroll + count-up
    document.querySelectorAll(".project-item").forEach(function (el) {
      el.classList.add("e-reveal");
    });
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (es) {
          es.forEach(function (e) {
            if (!e.isIntersecting) return;
            e.target.classList.add("in");
            io.unobserve(e.target);
            var c = e.target.querySelector("[data-count]");
            if (c) {
              var to = +c.dataset.count,
                n = 0;
              var t = setInterval(function () {
                n++;
                c.textContent = n;
                if (n >= to) clearInterval(t);
              }, 350 / to);
            }
          });
        },
        { threshold: 0.15 },
      );
      document.querySelectorAll(".e-reveal").forEach(function (el) {
        io.observe(el);
      });
    } else
      document.querySelectorAll(".e-reveal").forEach(function (el) {
        el.classList.add("in");
      });

    // 5. Active nav link
    var links = document.querySelectorAll(".navbar-links a[href^='#']");
    if ("IntersectionObserver" in window) {
      var so = new IntersectionObserver(
        function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting)
              links.forEach(function (a) {
                a.classList.toggle(
                  "active",
                  a.getAttribute("href") === "#" + e.target.id,
                );
              });
          });
        },
        { rootMargin: "-45% 0px -50% 0px" },
      );
      ["home", "about", "service", "project", "contact"].forEach(function (id) {
        var s = document.getElementById(id);
        if (s) so.observe(s);
      });
    }

    // 6. Working contact form (opens the visitor's email app, pre-filled)
    var form = $("#contactForm");
    if (form) {
      var status = document.createElement("p");
      status.className = "form-status";
      status.setAttribute("role", "status");
      form.appendChild(status);
      form.addEventListener(
        "submit",
        function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();
          var f = form.querySelectorAll("input,textarea");
          var name = f[0].value.trim(),
            mail = f[1].value.trim(),
            msg = f[2].value.trim();
          if (!name || !/^\S+@\S+\.\S+$/.test(mail) || msg.length < 5) {
            status.className = "form-status err";
            status.textContent =
              "Please enter your name, a valid email and a short message.";
            return;
          }
          var body = msg + "\n\n— " + name + " (" + mail + ")";
          window.location.href =
            "mailto:rajeshs18022006@gmail.com?subject=" +
            encodeURIComponent("Portfolio enquiry from " + name) +
            "&body=" +
            encodeURIComponent(body);
          status.className = "form-status ok";
          status.textContent = "Opening your email app… thank you!";
          form.reset();
        },
        true,
      );
    }
  });
})();

/* Minimal QR encoder (byte mode, error-correction L, versions 1-10) */
function rcQR(text) {
  var ECC = [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
    BLK = [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4];
  var bytes = unescape(encodeURIComponent(text))
    .split("")
    .map(function (c) {
      return c.charCodeAt(0);
    });
  function raw(v) {
    var r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      var a = Math.floor(v / 7) + 2;
      r -= (25 * a - 10) * a - 55;
      if (v >= 7) r -= 36;
    }
    return r;
  }
  var ver, cap;
  for (ver = 1; ver <= 10; ver++) {
    cap = Math.floor(raw(ver) / 8) - ECC[ver] * BLK[ver];
    if (bytes.length + (ver < 10 ? 2 : 3) <= cap) break;
  }
  if (ver > 10) return null;
  // bit stream
  var bits = [];
  function put(v, n) {
    for (var i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
  }
  put(4, 4);
  put(bytes.length, ver < 10 ? 8 : 16);
  bytes.forEach(function (b) {
    put(b, 8);
  });
  put(0, Math.min(4, cap * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  for (var pad = 0xec; bits.length < cap * 8; pad ^= 0xec ^ 0x11) put(pad, 8);
  var data = [];
  for (var i = 0; i < bits.length; i += 8) {
    var b = 0;
    for (var k = 0; k < 8; k++) b = (b << 1) | bits[i + k];
    data.push(b);
  }
  // Reed-Solomon
  function mul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  var deg = ECC[ver],
    div = [],
    j;
  for (i = 0; i < deg - 1; i++) div.push(0);
  div.push(1);
  var root = 1;
  for (i = 0; i < deg; i++) {
    for (j = 0; j < deg; j++) {
      div[j] = mul(div[j], root);
      if (j + 1 < deg) div[j] ^= div[j + 1];
    }
    root = mul(root, 2);
  }
  function rem(d) {
    var r = div.map(function () {
      return 0;
    });
    d.forEach(function (b) {
      var f = b ^ r.shift();
      r.push(0);
      div.forEach(function (c, i) {
        r[i] ^= mul(c, f);
      });
    });
    return r;
  }
  var nb = BLK[ver],
    rawCw = Math.floor(raw(ver) / 8),
    nShort = nb - (rawCw % nb),
    shortLen = Math.floor(rawCw / nb);
  var blocks = [],
    p = 0;
  for (i = 0; i < nb; i++) {
    var d = data.slice(p, p + shortLen - deg + (i < nShort ? 0 : 1));
    p += d.length;
    var e = rem(d);
    if (i < nShort) d.push(0);
    blocks.push(d.concat(e));
  }
  var out = [];
  for (i = 0; i < blocks[0].length; i++)
    blocks.forEach(function (bl, jj) {
      if (i != shortLen - deg || jj >= nShort) out.push(bl[i]);
    });
  // matrix
  var n = ver * 4 + 17,
    M = [],
    F = [];
  for (i = 0; i < n; i++) {
    M.push(new Array(n).fill(false));
    F.push(new Array(n).fill(false));
  }
  function set(x, y, v) {
    M[y][x] = v;
    F[y][x] = true;
  }
  for (i = 0; i < n; i++) {
    set(6, i, i % 2 == 0);
    set(i, 6, i % 2 == 0);
  }
  function finder(cx, cy) {
    for (var dy = -4; dy <= 4; dy++)
      for (var dx = -4; dx <= 4; dx++) {
        var dist = Math.max(Math.abs(dx), Math.abs(dy)),
          x = cx + dx,
          y = cy + dy;
        if (x >= 0 && x < n && y >= 0 && y < n)
          set(x, y, dist != 2 && dist != 4);
      }
  }
  finder(3, 3);
  finder(n - 4, 3);
  finder(3, n - 4);
  var pos = [];
  if (ver > 1) {
    var na = Math.floor(ver / 7) + 2,
      step = Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2;
    pos = [6];
    for (var q = n - 7; pos.length < na; q -= step) pos.splice(1, 0, q);
    for (i = 0; i < na; i++)
      for (j = 0; j < na; j++) {
        if (
          (i == 0 && j == 0) ||
          (i == 0 && j == na - 1) ||
          (i == na - 1 && j == 0)
        )
          continue;
        for (var dy = -2; dy <= 2; dy++)
          for (var dx = -2; dx <= 2; dx++)
            set(
              pos[i] + dx,
              pos[j] + dy,
              Math.max(Math.abs(dx), Math.abs(dy)) != 1,
            );
      }
  }
  function bit(x, i) {
    return ((x >>> i) & 1) != 0;
  }
  function fmt(mask) {
    var dd = (1 << 3) | mask,
      r = dd;
    for (var i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    var bs = ((dd << 10) | r) ^ 0x5412;
    for (i = 0; i <= 5; i++) set(8, i, bit(bs, i));
    set(8, 7, bit(bs, 6));
    set(8, 8, bit(bs, 7));
    set(7, 8, bit(bs, 8));
    for (i = 9; i < 15; i++) set(14 - i, 8, bit(bs, i));
    for (i = 0; i < 8; i++) set(n - 1 - i, 8, bit(bs, i));
    for (i = 8; i < 15; i++) set(8, n - 15 + i, bit(bs, i));
    set(8, n - 8, true);
  }
  fmt(0);
  if (ver >= 7) {
    var r2 = ver;
    for (i = 0; i < 12; i++) r2 = (r2 << 1) ^ ((r2 >>> 11) * 0x1f25);
    var vb = (ver << 12) | r2;
    for (i = 0; i < 18; i++) {
      var c = bit(vb, i),
        a = n - 11 + (i % 3),
        b2 = Math.floor(i / 3);
      set(a, b2, c);
      set(b2, a, c);
    }
  }
  // place codewords
  var idx = 0;
  for (var right = n - 1; right >= 1; right -= 2) {
    if (right == 6) right = 5;
    for (var vert = 0; vert < n; vert++)
      for (j = 0; j < 2; j++) {
        var x = right - j,
          up = ((right + 1) & 2) == 0,
          y = up ? n - 1 - vert : vert;
        if (!F[y][x] && idx < out.length * 8) {
          M[y][x] = bit(out[idx >>> 3], 7 - (idx & 7));
          idx++;
        }
      }
  }
  function mask(m) {
    for (var y = 0; y < n; y++)
      for (var x = 0; x < n; x++) {
        var inv;
        switch (m) {
          case 0:
            inv = (x + y) % 2 == 0;
            break;
          case 1:
            inv = y % 2 == 0;
            break;
          case 2:
            inv = x % 3 == 0;
            break;
          case 3:
            inv = (x + y) % 3 == 0;
            break;
          case 4:
            inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 == 0;
            break;
          case 5:
            inv = ((x * y) % 2) + ((x * y) % 3) == 0;
            break;
          case 6:
            inv = (((x * y) % 2) + ((x * y) % 3)) % 2 == 0;
            break;
          default:
            inv = (((x + y) % 2) + ((x * y) % 3)) % 2 == 0;
        }
        if (!F[y][x] && inv) M[y][x] = !M[y][x];
      }
  }
  function penalty() {
    var s = 0,
      y,
      x,
      run,
      dark = 0;
    for (var t = 0; t < 2; t++)
      for (y = 0; y < n; y++) {
        run = 1;
        for (x = 1; x < n; x++) {
          var A = t ? M[x][y] : M[y][x],
            B = t ? M[x - 1][y] : M[y][x - 1];
          if (A == B) {
            run++;
            if (run == 5) s += 3;
            else if (run > 5) s++;
          } else run = 1;
        }
      }
    for (y = 0; y < n - 1; y++)
      for (x = 0; x < n - 1; x++)
        if (
          M[y][x] == M[y][x + 1] &&
          M[y][x] == M[y + 1][x] &&
          M[y][x] == M[y + 1][x + 1]
        )
          s += 3;
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (M[y][x]) dark++;
    s += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
    return s;
  }
  var best = 0,
    bp = 1e9;
  for (var m = 0; m < 8; m++) {
    mask(m);
    fmt(m);
    var pn = penalty();
    if (pn < bp) {
      bp = pn;
      best = m;
    }
    mask(m);
  }
  mask(best);
  fmt(best);
  return M;
}

/* ===== Premium gold business card =====
   Desktop/PC  -> landscape "certificate" layout (seal, double gold frame)
   Phone       -> tall vertical card with diagonal gold ribbons            */
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var sec = document.querySelector(".footer-card-section");
    if (!sec) return;
    var I = {
      mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      tel: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
      gh: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>',
      li: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
      wa: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.4A8.5 8.5 0 1 1 21 11.5z"/>',
    };
    function ic(k) {
      return (
        '<i class="rc-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        I[k] +
        "</svg></i>"
      );
    }
    function row(href, text, k, ext) {
      return (
        '<a class="rc-row" href="' +
        href +
        '"' +
        (ext ? ' target="_blank" rel="noopener noreferrer"' : "") +
        ">" +
        ic(k) +
        "<span>" +
        text +
        "</span></a>"
      );
    }

    // scalloped seal outline
    var pts = [],
      N = 40,
      k;
    for (k = 0; k < N * 2; k++) {
      var r = k % 2 ? 84 : 95,
        a = (Math.PI * k) / N - Math.PI / 2;
      pts.push(
        (100 + r * Math.cos(a)).toFixed(1) +
          "," +
          (100 + r * Math.sin(a)).toFixed(1),
      );
    }

    // ornate corner (used 4x, mirrored by CSS)
    var corner =
      '<svg class="rc-corner" viewBox="0 0 60 60" fill="none" stroke="url(#rcg)" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M4 56V26C4 13 13 4 26 4h30"/><path d="M11 56V30c0-10 9-19 19-19h26"/>' +
      '<path d="M17 17c7 0 11 4 11 10s-5 9-9 7"/><circle cx="12" cy="12" r="2.4" fill="url(#rcg)"/></svg>';

    // contact details -> QR code (scan = phone offers to save the contact)
    var VCARD =
      "BEGIN:VCARD\nVERSION:3.0\nFN:Rajesh S\nTITLE:MERN Stack Developer\n" +
      "TEL;TYPE=CELL:+919025461022\nEMAIL:rajeshs18022006@gmail.com\n" +
      "URL:https://github.com/Rajesh006-jerry\nEND:VCARD";
    var qm = rcQR(VCARD),
      qrSVG = "";
    if (qm) {
      var qn = qm.length,
        qd = "";
      qm.forEach(function (rw, y) {
        rw.forEach(function (on, x) {
          if (on) qd += "M" + x + " " + y + "h1v1h-1z";
        });
      });
      qrSVG =
        '<svg viewBox="-2 -2 ' +
        (qn + 4) +
        " " +
        (qn + 4) +
        '" shape-rendering="crispEdges" role="img" aria-label="QR code with Rajesh S contact details">' +
        '<rect x="-2" y="-2" width="' +
        (qn + 4) +
        '" height="' +
        (qn + 4) +
        '" fill="#fff"/><path d="' +
        qd +
        '" fill="#0a0a0a"/></svg>';
    }

    sec.innerHTML =
      '<div class="gc-wrap"><div class="rc" id="goldCard"><div class="rc-in">' +
      // shared gold gradient
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
      '<linearGradient id="rcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset=".3" stop-color="#e6b93c"/><stop offset=".6" stop-color="#a67c00"/><stop offset=".82" stop-color="#f6dc7a"/><stop offset="1" stop-color="#b8860b"/></linearGradient></defs></svg>' +
      // mobile ribbon artwork (hidden on PC)
      '<svg class="rc-m-art" viewBox="0 0 360 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<rect class="rc-m-bg" width="360" height="230"/>' +
      '<circle cx="-25" cy="115" r="92" fill="url(#rcg)"/>' +
      '<circle cx="-25" cy="115" r="76" fill="none" stroke="#0a0a0a" stroke-opacity=".35" stroke-width="1.5"/>' +
      '<polygon points="55,0 135,0 360,160 360,215" fill="url(#rcg)"/>' +
      '<polygon points="135,0 190,0 360,122 360,160" class="rc-band"/>' +
      '<polygon points="190,0 206,0 360,110 360,122" fill="url(#rcg)"/>' +
      '<polygon points="206,0 222,0 360,98 360,110" class="rc-band"/>' +
      '<path d="M0 205 L250 0" stroke="url(#rcg)" stroke-width="1" opacity=".7"/><path d="M0 225 L270 6" stroke="url(#rcg)" stroke-width="1" opacity=".45"/>' +
      '<path d="M222 0 L360 92 V98 L216 0Z" fill="url(#rcg)" opacity=".5"/>' +
      '<circle cx="60" cy="40" r="2.5" fill="url(#rcg)"/><circle cx="82" cy="58" r="1.6" fill="url(#rcg)"/><circle cx="290" cy="30" r="2" fill="url(#rcg)"/>' +
      '<circle cx="-25" cy="115" r="62" fill="none" stroke="#0a0a0a" stroke-opacity=".3" stroke-width="1" stroke-dasharray="2 4"/>' +
      '<circle cx="330" cy="215" r="62" fill="none" stroke="url(#rcg)" stroke-width="1.5"/>' +
      '<circle cx="330" cy="215" r="50" fill="none" stroke="url(#rcg)" stroke-width="1" stroke-dasharray="2 4"/></svg>' +
      // frames + corners
      '<span class="rc-f1"></span>' +
      '<span class="rc-d t"></span><span class="rc-d b"></span><span class="rc-d l"></span><span class="rc-d r"></span>' +
      '<span class="rc-sp s1"></span><span class="rc-sp s2"></span><span class="rc-sp s3"></span><span class="rc-sp s4"></span><span class="rc-sp s5"></span>' +
      '<svg class="rc-rings" viewBox="0 0 200 200" fill="none" stroke="url(#rcg)" aria-hidden="true"><circle cx="100" cy="100" r="96" stroke-width="1"/><circle cx="100" cy="100" r="82" stroke-width="1.4" stroke-dasharray="1 5" stroke-linecap="round"/><circle cx="100" cy="100" r="68" stroke-width="1"/><circle cx="100" cy="100" r="54" stroke-width="1.4" stroke-dasharray="2 4"/><circle cx="100" cy="100" r="40" stroke-width="1"/></svg>' +
      '<svg class="rc-m-foot" viewBox="0 0 360 80" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,80 0,28 150,80" fill="url(#rcg)"/><polygon points="0,80 0,52 76,80" class="rc-band"/><polygon points="360,80 360,40 240,80" fill="url(#rcg)"/><polygon points="360,80 360,60 300,80" class="rc-band"/></svg>' +
      '<span class="rc-c tl">' +
      corner +
      '</span><span class="rc-c tr">' +
      corner +
      "</span>" +
      '<span class="rc-c bl">' +
      corner +
      '</span><span class="rc-c br">' +
      corner +
      "</span>" +
      // seal badge
      '<div class="rc-badge"><div class="rc-hang"><i></i><i></i></div>' +
      '<svg class="rc-ribbon" viewBox="0 0 200 280" aria-hidden="true">' +
      '<polygon points="52,150 108,168 84,272 66,248 36,258" fill="url(#rcg)"/>' +
      '<polygon points="148,150 92,168 116,272 134,248 164,258" fill="url(#rcg)" opacity=".9"/></svg>' +
      '<svg class="rc-seal" viewBox="0 0 200 200" aria-label="RS monogram">' +
      '<polygon points="' +
      pts.join(" ") +
      '" fill="url(#rcg)"/>' +
      '<circle cx="100" cy="100" r="79" fill="none" stroke="#5a4100" stroke-opacity=".5" stroke-width="1.6" stroke-dasharray="1 5" stroke-linecap="round"/>' +
      '<circle cx="100" cy="100" r="72" fill="none" stroke="#5a4100" stroke-opacity=".55" stroke-width="3"/>' +
      '<circle cx="100" cy="100" r="64" fill="none" stroke="#fff6c8" stroke-opacity=".6" stroke-width="1.5"/>' +
      '<text x="100" y="112" text-anchor="middle" font-size="60" font-weight="900" font-family="Georgia,serif" fill="#2e2100">RS</text><text x="100" y="146" text-anchor="middle" font-size="17" letter-spacing="7" fill="#2e2100">★★★</text></svg></div>' +
      '<div class="rc-divider"></div>' +
      // text
      '<div class="rc-main">' +
      '<div class="rc-head"><div class="rc-eyebrow">PORTFOLIO</div><div class="rc-sub">of a MERN Stack Developer</div><div class="rc-flourish"><i></i><b></b><i></i></div></div>' +
      '<div class="rc-id"><div class="rc-pre">Proudly presented by</div><div class="rc-name">RAJESH S</div>' +
      '<div class="rc-pos">MERN Stack Developer</div>' +
      '<div class="rc-meta"><b>BCA</b> · University of Madras · Tamil · English</div></div>' +
      '<div class="rc-low"><div class="rc-lowl"><div class="rc-list">' +
      row(
        "mailto:rajeshs18022006@gmail.com",
        "rajeshs18022006@gmail.com",
        "mail",
      ) +
      row("tel:+919025461022", "+91 90254 61022", "tel") +
      row(
        "https://github.com/Rajesh006-jerry",
        "github.com/Rajesh006-jerry",
        "gh",
        1,
      ) +
      row(
        "https://www.linkedin.com/in/rajesh-s-a58a342a8",
        "linkedin.com/in/rajesh-s-a58a342a8",
        "li",
        1,
      ) +
      row(
        "https://wa.me/919025461022?text=Hi%20Rajesh%20S",
        "Chat on WhatsApp",
        "wa",
        1,
      ) +
      "</div>" +
      '<div class="rc-actions"><button type="button" class="rc-btn fill" id="saveContact">↓ Save Contact</button>' +
      '<a class="rc-btn line" href="mailto:rajeshs18022006@gmail.com">Let’s Connect ↗</a></div></div>' +
      '<div class="rc-qr"><div class="rc-qrbox">' +
      qrSVG +
      "</div><span>SCAN TO SAVE CONTACT</span></div></div>" +
      '<span class="rc-avail"><i></i>OPEN TO WORK</span>' +
      "</div></div></div>" +
      '<p class="gc-copy">© ' +
      new Date().getFullYear() +
      " Rajesh S — MERN Stack Developer</p></div>";

    // Save contact (.vcf)
    document
      .getElementById("saveContact")
      .addEventListener("click", function () {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([VCARD], { type: "text/vcard" }));
        a.download = "Rajesh_S.vcf";
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
  });
})();
