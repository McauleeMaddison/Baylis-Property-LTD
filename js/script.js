/* ===== AUTH GUARD (runs before anything else) =====
   Enforce access by role using: <body data-required-role="resident">,
   <body data-required-role="landlord">, or "resident,landlord".
*/
(function authGuard() {
  var body = document.body;
  if (!body) return;
  var required = (body.dataset && body.dataset.requiredRole) || '';
  if (!required) return;

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
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  const header        = $("#mainHeader");
  const hamburgerBtn  = document.querySelector("[data-hamb]");
  const navLinks      = document.querySelector("[data-links]");
  const darkToggle    = $("#darkModeToggle");
  const darkIcon      = $("#darkModeIcon");
  const avatarBtn     = $("#avatarBtn") || $(".avatar-toggle");
  const userDropdown  = $("#userDropdown");
  const logoutBtn     = $("#logoutBtn");

  const landlordLoginForm = $("#landlordLoginForm");
  const landlordDashboard = $("#landlordDashboard");
  const landlordGate      = $("#landlordLoginGate");

  (function roleNav() {
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if (!role) return;
    $$("[data-role='landlord']").forEach(el => { el.style.display = role === "landlord" ? "" : "none"; });
    $$("[data-role='resident']").forEach(el => { el.style.display = role === "resident" ? "" : "none"; });
    const welcome = $("#userWelcome");
    if (welcome) welcome.textContent = localStorage.getItem("username") || "User";
  })();

  const setNavOpen = (open) => {
    if (!navLinks || !hamburgerBtn) return;
    navLinks.classList.toggle("show", !!open);
    navLinks.dataset.open = String(!!open);
    hamburgerBtn.setAttribute("aria-expanded", String(!!open));
    document.body.classList.toggle("nav-open", !!open);
  };

  on(hamburgerBtn, "click", () => setNavOpen(navLinks?.dataset.open !== "true"));

  on(navLinks, "click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    setNavOpen(false);
  });

  on(document, "keydown", (e) => {
    if (e.key === "Escape") setNavOpen(false);
  });

  on(document, "click", (e) => {
    if (!navLinks || !hamburgerBtn) return;
    if (!navLinks.contains(e.target) && !hamburgerBtn.contains(e.target)) setNavOpen(false);
  });

  const updateDarkMode = (enabled) => {
    document.body.classList.toggle("dark", !!enabled);
    if (darkIcon) darkIcon.textContent = enabled ? "🌙" : "🌞";
    try { localStorage.setItem("darkMode", enabled ? "true" : "false"); } catch {}
  };

   const applyAccent = (name) => {
  if (!name || name === 'blue') {
    document.documentElement.setAttribute('data-accent', 'blue');
  } else {
    document.documentElement.setAttribute('data-accent', name);
  }
  try { localStorage.setItem('accent', name); } catch {}
};

applyAccent(localStorage.getItem('accent') || 'blue');

document.querySelectorAll('[data-accent-option]').forEach(btn => {
  btn.addEventListener('click', () => {
    const choice = btn.getAttribute('data-accent-option');
    applyAccent(choice);
    if (window.showToast) showToast(`🎨 Accent set to ${choice}`);
  });
});

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
  on(window, "storage", (e) => {
    if (e.key === "darkMode") updateDarkMode(e.newValue === "true");
  });

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
    on(window, "scroll", onScroll, { passive: true });
  }

  on(avatarBtn, "click", (e) => {
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
    }
  });

  on(logoutBtn, "click", (e) => {
    showToast("👋 Logged out successfully");
    setTimeout(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("username");
      window.location.href = "login.html";
    }, 900);
    }, 900);
  });

  const panels = $$(".form-wrapper");
  const btns   = $$(".toggle-form-btn");

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  btns.forEach(btn => {n.dataset.target;
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
    });
  });

  if (location.hash) {
    const id = location.hash.slice(1);
    if (document.getElementById(id)) {
      openPanel(id);
      const btn = $(`.toggle-form-btn[data-target="${id}"]`);
      btn && btn.setAttribute("aria-expanded", "true");
    }
  }

  function openPanel(id) {deToggle(p, true);
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

  window.showToast = function (msg) {;
    el.setAttribute("aria-live", "polite");
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("show"), 30);
    setTimeout(() => el.classList.remove("show"), 3200);
    setTimeout(() => el.remove(), 3600);
  };
    setTimeout(() => el.remove(), 3600);
  };

  on(landlordLoginForm, "submit", (e) => {e.trim();
    const p = $("#landlordPassword")?.value.trim();
    if (u === "admin" && p === "landlord123") {
      landlordDashboard?.classList.remove("hidden");
      landlordGate?.classList.add("hidden");
      showToast("🔓 Landlord portal unlocked!");
    } else {
      showToast("❌ Invalid credentials");
    }
  });
    }
  });

  const getCsrfToken = () => {
    const match = document.cookie.match(/(?:^|;)\s*csrfToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };
  const csrfHeaders = (headers = {}) => {
    const token = getCsrfToken();
    return token ? { ...headers, 'X-CSRF-Token': token } : { ...headers };
  };

  const now = () => new Date().toLocaleString();

  const addLogItem = (ul, html) => {
    const li = document.createElement("li");
    li.className = "animated";
    li.innerHTML = html;
    ul.prepend(li);
  };

  const save = (k, arr) => { try { localStorage.setItem(k, JSON.stringify(arr)); } catch {} };
  const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };

  const cleaningForm = $("#cleaningForm");
  on(cleaningForm, "submit", async (e) => {rn cleaningForm.reportValidity();
    
    const msgEl = $("#cleaningMsg");
    const submitBtn = cleaningForm.querySelector("button[type='submit']");
    const originalText = submitBtn?.textContent;
    
    try {
      if (submitBtn) submitBtn.disabled = true;
      if (submitBtn) submitBtn.textContent = "Submitting...";
      
      const formData = new FormData(cleaningForm);
      const response = await fetch("/api/forms/cleaning", {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(Object.fromEntries(formData))
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit request");
      }
      
      showToast("✅ Cleaning request submitted successfully!");
      cleaningForm.reset();
      if (msgEl) msgEl.textContent = "";
      
      // Redirect to requests view after short delay
      setTimeout(() => {
        window.location.href = "/resident#requests";
      }, 1000);
    } catch (err) {
      if (msgEl) msgEl.textContent = err.message || "Error submitting request";
      showToast("❌ " + (err.message || "Error submitting request"));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitBtn) submitBtn.textContent = originalText;
    }
  });

      if (submitBtn) submitBtn.textContent = originalText;
    }
  });

  const repairForm = $("#repairForm");
  on(repairForm, "submit", async (e) => {
    const submitBtn = repairForm.querySelector("button[type='submit']");
    const originalText = submitBtn?.textContent;
    
    try {
      if (submitBtn) submitBtn.disabled = true;
      if (submitBtn) submitBtn.textContent = "Submitting...";
      
      const formData = new FormData(repairForm);
      const response = await fetch("/api/forms/repairs", {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(Object.fromEntries(formData))
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit request");
      }
      
      showToast("✅ Repair request submitted successfully!");
      repairForm.reset();
      if (msgEl) msgEl.textContent = "";
      
      // Redirect to requests view after short delay
      setTimeout(() => {
        window.location.href = "/resident#requests";
      }, 1000);
    } catch (err) {
      if (msgEl) msgEl.textContent = err.message || "Error submitting request";
      showToast("❌ " + (err.message || "Error submitting request"));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitBtn) submitBtn.textContent = originalText;
    }
  });

  // Community
      if (submitBtn) submitBtn.textContent = originalText;
    }
  });

  const communityForm = $("#communityForm");
  on(communityForm, "submit", async (e) => {ector("button[type='submit']");
    const originalText = submitBtn?.textContent;
    
    try {
      if (submitBtn) submitBtn.disabled = true;
      if (submitBtn) submitBtn.textContent = "Posting...";
      
      const formData = new FormData(communityForm);
      const response = await fetch("/api/forms/message", {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify(Object.fromEntries(formData))
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to post message");
      }
      
      showToast("✅ Message posted to community!");
      communityForm.reset();
      if (msgEl) msgEl.textContent = "";
      
      // Redirect to community page
      setTimeout(() => {
        window.location.href = "/community";
      }, 1000);
    } catch (err) {
      if (msgEl) msgEl.textContent = err.message || "Error posting message";
      showToast("❌ " + (err.message || "Error posting message"));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitBtn) submitBtn.textContent = originalText;
    }
  });

  /* ========== Utils ========== */
      if (submitBtn) submitBtn.textContent = originalText;
    }
  });

  function escapeHtml(str) {t;")
      .replaceAll("'", "&#039;");
  }
});
