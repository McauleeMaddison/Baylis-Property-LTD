/* ===== AUTH GUARD (runs before anything else) =====
   Enforce access by role using: <body data-required-role="resident">,
   <body data-required-role="landlord">, or "resident,landlord".
*/
(function authGuard() {
  var body = document.body;
  if (!body) return;
  var required = (body.dataset && body.dataset.requiredRole) || '';
  if (!required) return; // public page

  var token = localStorage.getItem('token');
  var role  = (localStorage.getItem('role') || '').toLowerCase();
  var allowed = required.split(',').map(function (r) { return r.trim().toLowerCase(); }).filter(Boolean);
  var ok = token && allowed.indexOf(role) !== -1;

  if (!ok) {
    try { localStorage.setItem('postLoginRedirect', location.pathname + location.search + location.hash); } catch {}
    location.replace('login.html');
  }
})();

"use strict";

window.addEventListener("DOMContentLoaded", () => {
  /* ========== Shorthands ========== */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  /* ========== Refs ========== */
  const header        = $("#mainHeader");
  const hamburgerBtn  = $("#hamburgerBtn");
  const navLinks      = $("#navLinks");
  const darkToggle    = $("#darkModeToggle");
  const darkIcon      = $("#darkModeIcon");
  const avatarBtn     = $("#avatarBtn") || $(".avatar-toggle");
  const userDropdown  = $("#userDropdown");
  const logoutBtn     = $("#logoutBtn");

  // Optional landlord gate (only present on certain pages)
  const landlordLoginForm = $("#landlordLoginForm");
  const landlordDashboard = $("#landlordDashboard");
  const landlordGate      = $("#landlordLoginGate");

  /* ========== Role-aware nav visibility ========== */
  (function roleNav() {
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if (!role) return;
    $$("[data-role='landlord']").forEach(el => { el.style.display = role === "landlord" ? "" : "none"; });
    $$("[data-role='resident']").forEach(el => { el.style.display = role === "resident" ? "" : "none"; });
    const welcome = $("#userWelcome");
    if (welcome) welcome.textContent = localStorage.getItem("username") || "User";
  })();

  /* ========== Mobile nav ========== */
  on(hamburgerBtn, "click", () => {
    const open = navLinks?.classList.toggle("show");
    hamburgerBtn.setAttribute("aria-expanded", String(!!open));
  });

  // Auto-close nav on link click (mobile)
  on(navLinks, "click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    if (window.innerWidth < 768) {
      navLinks.classList.remove("show");
      hamburgerBtn?.setAttribute("aria-expanded", "false");
    }
  });

  // Close nav with ESC
  on(document, "keydown", (e) => {
    if (e.key === "Escape" && navLinks?.classList.contains("show")) {
      navLinks.classList.remove("show");
      hamburgerBtn?.setAttribute("aria-expanded", "false");
      hamburgerBtn?.focus();
    }
  });

  /* ========== Dark mode (sync icon + persist + cross-tab sync) ========== */
  const updateDarkMode = (enabled) => {
    document.body.classList.toggle("dark", !!enabled);
    if (darkIcon) darkIcon.textContent = enabled ? "🌙" : "🌞";
    try { localStorage.setItem("darkMode", enabled ? "true" : "false"); } catch {}
  };

   /* ===== Accent theme ===== */
const applyAccent = (name) => {
  if (!name || name === 'blue') {
    document.documentElement.setAttribute('data-accent', 'blue'); // explicit default
  } else {
    document.documentElement.setAttribute('data-accent', name);
  }
  try { localStorage.setItem('accent', name); } catch {}
};

applyAccent(localStorage.getItem('accent') || 'blue');

// Click handlers for swatches
document.querySelectorAll('[data-accent-option]').forEach(btn => {
  btn.addEventListener('click', () => {
    const choice = btn.getAttribute('data-accent-option');
    applyAccent(choice);
    if (window.showToast) showToast(`🎨 Accent set to ${choice}`);
  });
});

// Sync across tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'accent') applyAccent(e.newValue || 'blue');
});


  const darkEnabled = localStorage.getItem("darkMode") === "true";
  if (darkToggle) {
    darkToggle.checked = darkEnabled;
    updateDarkMode(darkEnabled);
    on(darkToggle, "change", () => updateDarkMode(darkToggle.checked));
  } else {
    updateDarkMode(darkEnabled);
  }
  // Sync across tabs
  on(window, "storage", (e) => {
    if (e.key === "darkMode") updateDarkMode(e.newValue === "true");
  });

  /* ========== Header auto-hide on scroll (throttled) ========== */
  if (header) {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          if (y > lastY && y > 60) header.classList.add("hide-nav");
          else header.classList.remove("hide-nav");
          lastY = y;
          ticking = false;
        });
        ticking = true;
      }
    };
    on(window, "scroll", onScroll, { passive: true });
  }

  /* ========== Avatar dropdown (outside click + ESC + focus return) ========== */
  on(avatarBtn, "click", (e) => {
    e.stopPropagation();
    const expanded = avatarBtn.getAttribute("aria-expanded") === "true";
    avatarBtn.setAttribute("aria-expanded", String(!expanded));
    userDropdown?.classList.toggle("hidden");
    if (!expanded) {
      const first = userDropdown?.querySelector("a,button");
      first && first.focus?.();
    }
  });

  on(document, "click", (e) => {
    if (!userDropdown) return;
    if (!userDropdown.contains(e.target) && !avatarBtn?.contains(e.target)) {
      userDropdown.classList.add("hidden");
      avatarBtn?.setAttribute("aria-expanded", "false");
    }
  });

  on(document, "keydown", (e) => {
    if (e.key === "Escape" && !userDropdown?.classList.contains("hidden")) {
      userDropdown?.classList.add("hidden");
      avatarBtn?.setAttribute("aria-expanded", "false");
      avatarBtn?.focus();
    }
  });

  /* ========== Logout ========== */
  on(logoutBtn, "click", (e) => {
    e.preventDefault();
    showToast("👋 Logged out successfully");
    setTimeout(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("username");
      window.location.href = "login.html";
    }, 900);
  });

  /* ========== One-at-a-time form panels (accessible + deep-link) ========== */
  const panels = $$(".form-wrapper");
  const btns   = $$(".toggle-form-btn");

  // Respect reduced motion
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  btns.forEach(btn => {
    const targetId = btn.dataset.target;
    btn.setAttribute("aria-controls", targetId);
    btn.setAttribute("aria-expanded", "false");
    on(btn, "click", () => {
      openPanel(targetId);
      // update aria-expanded on all toggles
      btns.forEach(b => {
        const pid = b.dataset.target;
        const open = !$("#" + pid)?.classList.contains("hidden");
        b.setAttribute("aria-expanded", String(open));
      });
    });
  });

  // Open a panel if URL hash refers to it (e.g., index.html#repairForm)
  if (location.hash) {
    const id = location.hash.slice(1);
    if (document.getElementById(id)) {
      openPanel(id);
      const btn = $(`.toggle-form-btn[data-target="${id}"]`);
      btn && btn.setAttribute("aria-expanded", "true");
    }
  }

  function openPanel(id) {
    panels.forEach(p => {
      if (p.id === id) slideToggle(p, true);
      else slideToggle(p, false);
    });
  }

  function slideToggle(el, open) {
    if (!el) return;
    const isOpen = !el.classList.contains("hidden");
    if (open && !isOpen) slideDown(el);
    if (!open && isOpen) slideUp(el);
  }

  function slideDown(el) {
    if (prefersReduced) { el.classList.remove("hidden"); return; }
    el.classList.remove("hidden");
    el.style.height = "0px";
    el.style.overflow = "hidden";
    el.style.transition = "height 300ms var(--transition-smooth, ease)";
    const h = el.scrollHeight;
    requestAnimationFrame(() => {
      el.style.height = h + "px";
      setTimeout(() => {
        el.style.height = "";
        el.style.overflow = "";
        el.style.transition = "";
      }, 320);
    });
  }

  function slideUp(el) {
    if (prefersReduced) { el.classList.add("hidden"); return; }
    el.style.overflow = "hidden";
    el.style.transition = "height 300ms var(--transition-smooth, ease)";
    el.style.height = el.scrollHeight + "px";
    requestAnimationFrame(() => {
      el.style.height = "0px";
      setTimeout(() => {
        el.classList.add("hidden");
        el.style.height = "";
        el.style.overflow = "";
        el.style.transition = "";
      }, 320);
    });
  }

  /* ========== Toast (global, accessible) ========== */
  window.showToast = function (msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("show"), 30);
    setTimeout(() => el.classList.remove("show"), 3200);
    setTimeout(() => el.remove(), 3600);
  };

  /* ========== Landlord login gate (optional section) ========== */
  on(landlordLoginForm, "submit", (e) => {
    e.preventDefault();
    const u = $("#landlordUsername")?.value.trim();
    const p = $("#landlordPassword")?.value.trim();
    if (u === "admin" && p === "landlord123") {
      landlordDashboard?.classList.remove("hidden");
      landlordGate?.classList.add("hidden");
      showToast("🔓 Landlord portal unlocked!");
    } else {
      showToast("❌ Invalid credentials");
    }
  });

  /* ========== Submission helpers (with optional local persistence) ========== */
  const now = () => new Date().toLocaleString();

  const addLogItem = (ul, html) => {
    const li = document.createElement("li");
    li.className = "animated";
    li.innerHTML = html;
    ul.prepend(li);
  };

  // Simple persist utils
  const save = (k, arr) => { try { localStorage.setItem(k, JSON.stringify(arr)); } catch {} };
  const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };

  // Cleaning
  const cleaningForm = $("#cleaningForm form");
  const cleaningLog  = $("#cleaningSubmissions");
  if (cleaningLog) load("log:cleaning").forEach(html => addLogItem(cleaningLog, html));
  on(cleaningForm, "submit", (e) => {
    e.preventDefault();
    if (!cleaningForm.checkValidity()) return cleaningForm.reportValidity();
    const name = $("#cleaningName")?.value.trim();
    const date = $("#cleaningDate")?.value;
    const type = $("#cleaningType")?.value;
    if (!(name && date && type && cleaningLog)) return;
    const line = `🧼 <strong>${escapeHtml(name)}</strong> requested a "<em>${escapeHtml(type)}</em>" clean on ${escapeHtml(date)} <small class="muted">(${now()})</small>`;
    addLogItem(cleaningLog, line);
    save("log:cleaning", [line, ...load("log:cleaning")].slice(0, 50));
    cleaningForm.reset();
    showToast("✅ Cleaning request submitted");
  });

  // Repair
  const repairForm = $("#repairForm form");
  const repairLog  = $("#repairSubmissions");
  if (repairLog) load("log:repair").forEach(html => addLogItem(repairLog, html));
  on(repairForm, "submit", (e) => {
    e.preventDefault();
    if (!repairForm.checkValidity()) return repairForm.reportValidity();
    const name  = $("#repairName")?.value.trim();
    const issue = $("#repairIssue")?.value.trim();
    if (!(name && issue && repairLog)) return;
    const line = `🛠️ <strong>${escapeHtml(name)}</strong> reported: ${escapeHtml(issue)} <small class="muted">(${now()})</small>`;
    addLogItem(repairLog, line);
    save("log:repair", [line, ...load("log:repair")].slice(0, 50));
    repairForm.reset();
    showToast("✅ Repair request submitted");
  });

  // Community
  const communityForm = $("#communityPostForm form");
  const communityFeed = $("#communityPosts");
  if (communityFeed) load("log:community").forEach(html => addLogItem(communityFeed, html));
  on(communityForm, "submit", (e) => {
    e.preventDefault();
    if (!communityForm.checkValidity()) return communityForm.reportValidity();
    const name = $("#posterName")?.value.trim();
    const msg  = $("#posterMessage")?.value.trim();
    if (!(name && msg && communityFeed)) return;
    const line = `💬 <strong>${escapeHtml(name)}</strong>: ${escapeHtml(msg)} <small class="muted">(${now()})</small>`;
    addLogItem(communityFeed, line);
    save("log:community", [line, ...load("log:community")].slice(0, 100));
    communityForm.reset();
    showToast("💬 Post added to community");
  });

  /* ========== Utils ========== */
  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
});
