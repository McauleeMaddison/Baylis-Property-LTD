/* -------------------------------------------------------
   Global UI helpers for Baylis Property LTD
   ----------------------------------------------------- */

/* ==== Lightweight auth gate (runs before DOM ready) ==== */
(function authGuard() {
  var body = document.body;
  if (!body) return;
  var required = (body.dataset && body.dataset.requiredRole) || "";
  if (!required) return;

  var token = localStorage.getItem("token");
  var role = (localStorage.getItem("role") || "").toLowerCase();
  var allowed = required.split(",").map(function (r) { return r.trim().toLowerCase(); }).filter(Boolean);
  var ok = token && allowed.indexOf(role) !== -1;

  if (!ok) {
    try {
      localStorage.setItem("postLoginRedirect", location.pathname + location.search + location.hash);
    } catch (_) {}
    location.replace("login.html");
  }
})();

/* ==== Toast helper (available immediately for other bundles) ==== */
(function defineToast() {
  if (typeof window.showToast === "function") return;

  window.showToast = function showToast(message) {
    var host = document.body || document.documentElement;
    if (!host) return alert(message);

    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    host.appendChild(el);

    requestAnimationFrame(function () { el.classList.add("show"); });
    setTimeout(function () { el.classList.remove("show"); }, 3200);
    setTimeout(function () { el.remove(); }, 3600);
  };
})();

/* ==== Main UI wiring ==== */
(function bootstrap() {
  "use strict";

  var ready = function () {
    var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
    var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
    var on = function (el, ev, fn, opts) { el && el.addEventListener(ev, fn, opts); };

    var root            = document.documentElement;
    var header          = $("#mainHeader");
    var hamburgerBtn    = document.querySelector("[data-hamb]");
    var navLinks        = document.querySelector("[data-links]");
    var darkToggle      = $("#darkModeToggle");
    var darkIcon        = $("#darkModeIcon");
    var avatarBtn       = $("#avatarBtn") || document.querySelector(".avatar-toggle");
    var userDropdown    = $("#userDropdown");
    var logoutBtn       = $("#logoutBtn");

    var cleaningForm    = $("#cleaningForm");
    var cleaningMsg     = $("#cleaningMsg");
    var repairForm      = $("#repairForm");
    var repairMsg       = $("#repairMsg");
    var communityForm   = $("#communityForm");
    var communityMsg    = $("#communityMsg");

    var prefersReduced  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var apiBase         = document.body?.getAttribute("data-api-base") || window.API_BASE || "/api";

    /* ---- Role-aware navigation ---- */
    (function syncRoleNav() {
      var role = (localStorage.getItem("role") || "").toLowerCase();
      if (!role) return;

      $$("[data-role]").forEach(function (el) {
        var target = (el.dataset.role || "").toLowerCase();
        if (!target) return;
        var allowed = target.split(",").map(function (r) { return r.trim(); }).filter(Boolean);
        el.style.display = allowed.indexOf(role) !== -1 ? "" : "none";
      });

      var welcome = $("#userWelcome");
      if (welcome) welcome.textContent = localStorage.getItem("username") || "User";
    })();

    /* ---- Navigation toggle ---- */
    var setNavOpen = function (open) {
      if (!navLinks || !hamburgerBtn) return;
      navLinks.classList.toggle("show", !!open);
      navLinks.dataset.open = String(!!open);
      hamburgerBtn.setAttribute("aria-expanded", String(!!open));
      document.body.classList.toggle("nav-open", !!open);
    };

    on(hamburgerBtn, "click", function () {
      var isOpen = navLinks?.dataset.open === "true";
      setNavOpen(!isOpen);
    });
    on(navLinks, "click", function (event) {
      if (event.target.closest("a")) setNavOpen(false);
    });
    on(document, "keydown", function (event) {
      if (event.key === "Escape") setNavOpen(false);
    });
    on(document, "click", function (event) {
      if (!navLinks || !hamburgerBtn) return;
      if (!navLinks.contains(event.target) && !hamburgerBtn.contains(event.target)) setNavOpen(false);
    });

    /* ---- Dark mode toggle ---- */
    var updateDarkMode = function (enabled) {
      document.body.classList.toggle("dark", !!enabled);
      if (darkIcon) darkIcon.textContent = enabled ? "🌙" : "🌞";
      try { localStorage.setItem("darkMode", enabled ? "true" : "false"); } catch (_) {}
    };
    var darkEnabled = localStorage.getItem("darkMode") === "true";
    updateDarkMode(darkEnabled);
    if (darkToggle) {
      darkToggle.checked = darkEnabled;
      on(darkToggle, "change", function () { updateDarkMode(darkToggle.checked); });
    }

    /* ---- Accent color toggle ---- */
    var applyAccent = function (value) {
      var name = value || "blue";
      root.setAttribute("data-accent", name);
      try { localStorage.setItem("accent", name); } catch (_) {}
    };
    applyAccent(localStorage.getItem("accent") || "blue");
    $$("[data-accent-option]").forEach(function (btn) {
      on(btn, "click", function () {
        var choice = btn.getAttribute("data-accent-option");
        applyAccent(choice);
        window.showToast && window.showToast("🎨 Accent set to " + choice);
      });
    });

    /* ---- Sync preferences across tabs ---- */
    on(window, "storage", function (event) {
      if (event.key === "darkMode") updateDarkMode(event.newValue === "true");
      if (event.key === "accent") applyAccent(event.newValue || "blue");
    });

    /* ---- Header auto-hide on scroll ---- */
    if (header) {
      var lastY = window.scrollY;
      var ticking = false;
      var handleScroll = function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          var y = window.scrollY;
          if (y > lastY && y > 80) header.classList.add("hide-nav");
          else header.classList.remove("hide-nav");
          lastY = y;
          ticking = false;
        });
      };
      on(window, "scroll", handleScroll, { passive: true });
    }

    /* ---- Avatar dropdown ---- */
    var hideDropdown = function () {
      if (!userDropdown) return;
      userDropdown.classList.add("hidden");
      avatarBtn?.setAttribute("aria-expanded", "false");
    };
    on(avatarBtn, "click", function () {
      if (!userDropdown) return;
      var isHidden = userDropdown.classList.contains("hidden");
      userDropdown.classList.toggle("hidden", !isHidden);
      avatarBtn.setAttribute("aria-expanded", String(isHidden));
      if (isHidden) {
        var first = userDropdown.querySelector("a,button");
        first && first.focus();
      }
    });
    on(document, "click", function (event) {
      if (!userDropdown || !avatarBtn) return;
      if (!userDropdown.contains(event.target) && !avatarBtn.contains(event.target)) hideDropdown();
    });
    on(document, "keydown", function (event) {
      if (event.key === "Escape") hideDropdown();
    });

    /* ---- Logout ---- */
    on(logoutBtn, "click", function (event) {
      event.preventDefault();
      window.showToast("👋 Logged out successfully");
      setTimeout(function () {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        window.location.href = "login.html";
      }, 900);
    });

    /* ---- Sliding panels (used by auth/register views) ---- */
    var panels = $$(".form-wrapper");
    var toggles = $$(".toggle-form-btn");

    var openPanel = function (id) {
      panels.forEach(function (panel) {
        var shouldOpen = panel.id === id;
        slideToggle(panel, shouldOpen);
      });
      toggles.forEach(function (btn) {
        var targetId = btn.dataset.target;
        if (!targetId) return;
        var target = document.getElementById(targetId);
        var isOpen = target && !target.classList.contains("hidden");
        btn.setAttribute("aria-expanded", String(!!isOpen));
      });
    };

    toggles.forEach(function (btn) {
      var targetId = btn.dataset.target;
      if (!targetId) return;
      btn.setAttribute("aria-controls", targetId);
      btn.setAttribute("aria-expanded", "false");
      on(btn, "click", function () { openPanel(targetId); });
    });

    if (location.hash) {
      var initialId = location.hash.slice(1);
      if (document.getElementById(initialId)) openPanel(initialId);
    }

    function slideToggle(el, open) {
      if (!el) return;
      var isOpen = !el.classList.contains("hidden");
      if (open && !isOpen) return slideDown(el);
      if (!open && isOpen) return slideUp(el);
    }
    function slideDown(el) {
      if (prefersReduced) { el.classList.remove("hidden"); return; }
      el.classList.remove("hidden");
      el.style.height = "0px";
      el.style.overflow = "hidden";
      el.style.transition = "height 300ms var(--transition-smooth, ease)";
      var height = el.scrollHeight;
      requestAnimationFrame(function () { el.style.height = height + "px"; });
      setTimeout(function () {
        el.style.height = "";
        el.style.overflow = "";
        el.style.transition = "";
      }, 320);
    }
    function slideUp(el) {
      if (prefersReduced) { el.classList.add("hidden"); return; }
      el.style.overflow = "hidden";
      el.style.transition = "height 300ms var(--transition-smooth, ease)";
      el.style.height = el.scrollHeight + "px";
      requestAnimationFrame(function () { el.style.height = "0px"; });
      setTimeout(function () {
        el.classList.add("hidden");
        el.style.height = "";
        el.style.overflow = "";
        el.style.transition = "";
      }, 320);
    }

    /* ---- Landlord gate (simple local demo) ---- */
    var landlordLoginForm = $("#landlordLoginForm");
    var landlordDashboard = $("#landlordDashboard");
    var landlordGate = $("#landlordLoginGate");

    on(landlordLoginForm, "submit", function (event) {
      event.preventDefault();
      var user = ($("#landlordUsername")?.value || "").trim();
      var pass = ($("#landlordPassword")?.value || "").trim();
      if (user === "admin" && pass === "landlord123") {
        landlordDashboard?.classList.remove("hidden");
        landlordGate?.classList.add("hidden");
        window.showToast("🔓 Landlord portal unlocked!");
      } else {
        window.showToast("❌ Invalid credentials");
      }
    });

    /* ---- CSRF helpers ---- */
    var getCsrfToken = function () {
      var match = document.cookie.match(/(?:^|;)\\s*csrfToken=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : "";
    };
    var csrfHeaders = function (headers) {
      var token = getCsrfToken();
      return token ? Object.assign({}, headers || {}, { "X-CSRF-Token": token }) : Object.assign({}, headers || {});
    };

    /* ---- Generic form handler ---- */
    var handleFormSubmit = function (form, msgEl, options) {
      on(form, "submit", function (event) {
        event.preventDefault();
        if (typeof form.reportValidity === "function" && !form.reportValidity()) return;

        var submitBtn = form.querySelector("button[type='submit'], input[type='submit']");
        var originalText = submitBtn?.textContent;
        msgEl && (msgEl.textContent = "");

        var startTime = Date.now();
        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            if (options.loadingText) submitBtn.textContent = options.loadingText;
          }
        } catch (_) {}

        var formData = new FormData(form);
        var payload = {};
        formData.forEach(function (value, key) { payload[key] = value; });

        fetch(options.endpoint.startsWith("http") ? options.endpoint : (apiBase ? apiBase.replace(/\\/$/, "") + options.endpoint : options.endpoint), {
          method: "POST",
          headers: csrfHeaders({ "Content-Type": "application/json" }),
          credentials: "include",
          body: JSON.stringify(payload)
        })
          .then(function (response) {
            if (!response.ok) return response.json().catch(function () { return {}; }).then(function (data) {
              throw new Error(data.error || "Unable to submit request");
            });
            return response.json().catch(function () { return {}; });
          })
          .then(function () {
            form.reset();
            msgEl && (msgEl.textContent = "");
            window.showToast(options.successMessage);
            try {
              window.dispatchEvent(new CustomEvent("baylis:form-success", {
                detail: { endpoint: options.endpoint, payload: Object.assign({}, payload) }
              }));
            } catch (_) {}
            if (options.redirect) {
              setTimeout(function () { window.location.href = options.redirect; }, 1000);
            }
          })
          .catch(function (err) {
            var text = err?.message || "Something went wrong";
            if (msgEl) {
              msgEl.textContent = text;
              msgEl.focus?.();
            }
            window.showToast("❌ " + text);
            try {
              window.dispatchEvent(new CustomEvent("baylis:form-error", {
                detail: { endpoint: options.endpoint, payload: Object.assign({}, payload), error: text }
              }));
            } catch (_) {}
          })
          .finally(function () {
            if (submitBtn) {
              submitBtn.disabled = false;
              if (options.loadingText) submitBtn.textContent = originalText;
            }
            var duration = Date.now() - startTime;
            if (duration < 350) setTimeout(function () {}, 350 - duration);
          });
      });
    };

    if (cleaningForm) {
      handleFormSubmit(cleaningForm, cleaningMsg, {
        endpoint: "/forms/cleaning",
        loadingText: "Submitting...",
        successMessage: "✅ Cleaning request submitted successfully!",
        redirect: "/resident#requests"
      });
    }
    if (repairForm) {
      handleFormSubmit(repairForm, repairMsg, {
        endpoint: "/forms/repairs",
        loadingText: "Submitting...",
        successMessage: "✅ Repair request submitted successfully!",
        redirect: "/resident#requests"
      });
    }
    if (communityForm) {
      handleFormSubmit(communityForm, communityMsg, {
        endpoint: "/forms/message",
        loadingText: "Posting...",
        successMessage: "✅ Message posted to community!",
        redirect: "/community"
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready, { once: true });
  } else {
    ready();
  }
})();
