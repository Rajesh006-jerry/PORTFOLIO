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

    // 3. New content: stats + what I deliver + how I work
    var deliver = [
      [
        "Clean REST APIs",
        "RESTful Express APIs with middleware, validation, webhooks and microservice-style structure, tested in Postman.",
      ],
      [
        "Secure Auth",
        "JWT authentication, role-based access control (RBAC) and protected CRUD operations.",
      ],
      [
        "Responsive React UI",
        "Reusable React and Next.js components (SSR/SSG), styled with Tailwind CSS or Bootstrap for every screen size.",
      ],
      [
        "Deploy & Maintain",
        "Git and GitHub workflows, CI/CD with GitHub Actions, and deployment on Vercel.",
      ],
    ];
    var steps = [
      [
        "Understand",
        "Clarify the user problem, the users, and what success looks like.",
      ],
      [
        "Design",
        "Plan the data model in MongoDB and the API contract before coding.",
      ],
      [
        "Build",
        "Ship the API and React UI in small, tested, reviewable commits.",
      ],
      [
        "Launch & Improve",
        "Deploy, collect feedback, fix bugs and iterate quickly.",
      ],
    ];
    var sec = document.createElement("section");
    sec.id = "highlights";
    sec.className = "extra";
    sec.innerHTML =
      '<div class="extra-inner">' +
      '<p class="extra-eyebrow">What I bring</p><h2 class="extra-title">Built for real users</h2>' +
      '<div class="e-grid">' +
      deliver
        .map(function (d, i) {
          return (
            '<div class="e-card e-reveal"><span class="n">0' +
            (i + 1) +
            "</span><h3>" +
            d[0] +
            "</h3><p>" +
            d[1] +
            "</p></div>"
          );
        })
        .join("") +
      "</div>" +
      '<p class="extra-eyebrow">My process</p><h2 class="extra-title">How I work</h2>' +
      '<div class="e-grid">' +
      steps
        .map(function (d, i) {
          return (
            '<div class="e-card e-reveal"><span class="n">STEP 0' +
            (i + 1) +
            "</span><h3>" +
            d[0] +
            "</h3><p>" +
            d[1] +
            "</p></div>"
          );
        })
        .join("") +
      "</div></div>";
    var proj = $("#project");
    proj.parentNode.insertBefore(sec, proj);

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

/* ===== Premium gold business card (replaces footer card) ===== */
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
        '<i class="gc-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        I[k] +
        "</svg></i>"
      );
    }
    function row(href, text, k, ext) {
      return (
        '<a class="gc-row" href="' +
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
    sec.innerHTML =
      '<div class="gc-wrap"><div class="gc" id="goldCard"><div class="gc-in">' +
      '<svg class="gc-art" viewBox="0 0 1000 571" preserveAspectRatio="none" aria-hidden="true"><defs>' +
      '<linearGradient id="gcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset=".3" stop-color="#e6b93c"/><stop offset=".55" stop-color="#a67c00"/><stop offset=".8" stop-color="#f6dc7a"/><stop offset="1" stop-color="#b8860b"/></linearGradient>' +
      '<linearGradient id="gcPanelDark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c1c1c"/><stop offset="1" stop-color="#0f0f0f"/></linearGradient>' +
      '<linearGradient id="gcPanelLight" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#e4e6ea"/><stop offset="1" stop-color="#f6f7f9"/></linearGradient></defs>' +
      '<polygon points="400,0 445,0 590,285.5 445,571 400,571 545,285.5" fill="url(#gcg)"/>' +
      '<polygon class="gc-bar" points="445,0 475,0 620,285.5 475,571 445,571 590,285.5"/>' +
      '<polygon points="475,0 487,0 632,285.5 487,571 475,571 620,285.5" fill="url(#gcg)"/>' +
      '<polygon class="gc-bar" points="487,0 505,0 650,285.5 505,571 487,571 632,285.5"/>' +
      '<polygon points="0,0 400,0 545,285.5 400,571 0,571" class="gc-panel"/>' +
      '<polygon points="505,0 512,0 657,285.5 512,571 505,571 650,285.5" fill="url(#gcg)"/></svg>' +
      '<div class="gc-left"><div class="gc-mono"><span>RS</span></div>' +
      '<div class="gc-brand">RAJESH S<small>PORTFOLIO</small></div>' +
      '<div class="gc-meta"><b>BCA</b> · University of Madras<br>Tamil · English</div>' +
      '<span class="gc-avail"><i></i>OPEN TO WORK</span></div>' +
      '<div class="gc-right"><div><div class="gc-name">RAJESH S</div><div class="gc-pos">MERN STACK DEVELOPER</div></div>' +
      '<div class="gc-list">' +
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
      '</div><div class="gc-actions"><button type="button" class="gc-btn fill" id="saveContact">↓ Save Contact</button>' +
      '<a class="gc-btn line" href="mailto:rajeshs18022006@gmail.com">Let’s Connect ↗</a></div></div>' +
      '</div></div><p class="gc-copy">© ' +
      new Date().getFullYear() +
      " Rajesh S — MERN Stack Developer</p></div>";

    // Save contact (.vcf)
    document
      .getElementById("saveContact")
      .addEventListener("click", function () {
        var v =
          "BEGIN:VCARD\nVERSION:3.0\nFN:Rajesh S\nN:S;Rajesh;;;\nTITLE:MERN Stack Developer\n" +
          "EMAIL:rajeshs18022006@gmail.com\nTEL;TYPE=CELL:+919025461022\n" +
          "URL:https://github.com/Rajesh006-jerry\nURL:https://www.linkedin.com/in/rajesh-s-a58a342a8\nEND:VCARD";
        var a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([v], { type: "text/vcard" }));
        a.download = "Rajesh_S.vcf";
        document.body.appendChild(a);
        a.click();
        a.remove();
      });

    // Subtle 3D tilt (desktop, motion allowed)
    var card = document.getElementById("goldCard");
    var fine = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
    var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (fine && !calm) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5,
          y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          "perspective(1200px) rotateY(" +
          x * 6 +
          "deg) rotateX(" +
          -y * 6 +
          "deg)";
      });
      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
      });
    }
  });
})();
