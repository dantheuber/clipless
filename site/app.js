/* ============================================================
   Clipless site — interactions (no framework)
   Theme is initialised inline in <head> to avoid a flash; this
   file wires up the toggle, nav, scroll reveal and docs TOC.
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var STORAGE_KEY = "clipless-theme";

  /* ---- Theme: toggle, persist, follow system until a manual choice ---- */
  function hasManualChoice() {
    try { return !!localStorage.getItem(STORAGE_KEY); } catch (e) { return false; }
  }

  function applyThemeLabels(theme) {
    // Update any "Try light/dark mode" labels to name the *other* theme.
    var other = theme === "dark" ? "light" : "dark";
    document.querySelectorAll("[data-theme-label]").forEach(function (el) {
      el.textContent = other;
    });
  }

  function setTheme(theme, manual) {
    root.dataset.theme = theme;
    if (manual) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    }
    applyThemeLabels(theme);
  }

  function toggleTheme() {
    var next = root.dataset.theme === "dark" ? "light" : "dark";
    setTheme(next, true);
  }

  // Init labels for whatever theme the inline head script picked.
  applyThemeLabels(root.dataset.theme || "dark");

  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", toggleTheme);
  });

  // Follow the OS theme until the user makes a manual choice this session.
  var mq = window.matchMedia("(prefers-color-scheme: light)");
  var onScheme = function (e) {
    if (!hasManualChoice()) setTheme(e.matches ? "light" : "dark", false);
  };
  if (mq.addEventListener) mq.addEventListener("change", onScheme);
  else if (mq.addListener) mq.addListener(onScheme);

  /* ---- Nav: shadow on scroll ---- */
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle("scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Mobile nav drawer ---- */
  var navToggle = document.querySelector("[data-nav-toggle]");
  var navMobile = document.querySelector(".nav-mobile");
  if (navToggle && navMobile) {
    navToggle.addEventListener("click", function () {
      var open = navMobile.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navMobile.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navMobile.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- Scroll reveal ---- */
  var reveal = document.querySelectorAll(".reveal:not(.in)");
  if (!("IntersectionObserver" in window)) {
    reveal.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveal.forEach(function (el) { io.observe(el); });
  }

  /* ---- Docs: scroll-spy highlighting of the TOC ---- */
  var docsNav = document.querySelector(".docs-nav");
  if (docsNav) {
    var links = Array.prototype.slice.call(docsNav.querySelectorAll("a[href^='#']"));
    var byId = {};
    var sections = links
      .map(function (a) {
        var id = a.getAttribute("href").slice(1);
        var sec = document.getElementById(id);
        if (sec) byId[id] = a;
        return sec;
      })
      .filter(Boolean);

    var current = null;
    var setActive = function (id) {
      if (id === current) return;
      current = id;
      links.forEach(function (a) {
        a.classList.toggle("active", a.getAttribute("href") === "#" + id);
      });
    };

    var spy = new IntersectionObserver(function (entries) {
      // Pick the heading nearest the top that is currently on screen.
      var visible = entries
        .filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      if (visible.length) setActive(visible[0].target.id);
    }, { rootMargin: "-80px 0px -70% 0px", threshold: 0 });

    sections.forEach(function (sec) { spy.observe(sec); });
  }
})();
