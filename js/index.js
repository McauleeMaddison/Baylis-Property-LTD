// index.js - Resident Dashboard
(() => {
  const fallbackQs  = (s, r=document) => r.querySelector(s);
  const fallbackQsa = (s, r=document) => [...r.querySelectorAll(s)];

  const qs  = (window.APP?.utils?.qs)  || fallbackQs;
  const qsa = (window.APP?.utils?.qsa) || fallbackQsa;

  // Defensive store access
  const safeGetList = (key) => {
    try {
      const list = window.APP?.store?.getList?.(key);
      return Array.isArray(list) ? list : [];
    } catch { return []; }
  };

  // ==== Dashboard bits ====
  function updateWelcome() {
    const el = qs("#userWelcome");
    if (!el) return;
    const name = (localStorage.getItem("username") || "Resident").toString().trim();
    el.textContent = name || "Resident";
  }

  function computeKpis() {
    const clean = safeGetList("log:cleaning");
    const repl  = safeGetList("log:repair");
    const posts = safeGetList("log:community");

    const all = [...clean, ...repl];

    const counts = all.reduce((a, x) => {
      const s = String(x?.status ?? "open").toLowerCase();
      if (s.includes("in")) a.in_progress++;
      else if (s.includes("done") || s.includes("closed") || s === "resolved") a.done++;
      else a.open++;
      return a;
    }, { open:0, in_progress:0, done:0 });

    const set = (sel, v) => { const n = qs(sel); if (n) n.textContent = String(v); };
    set("#kpiOpen",       counts.open);
    set("#kpiInProgress", counts.in_progress);
    set("#kpiDone",       counts.done);
    set("#kpiPosts",      posts.length);
  }

  function hydrateActivity() {
    const myC = qs("#myCleaning");
    const myR = qs("#myRepairs");
    const myP = qs("#myPosts");
    if (!myC && !myR && !myP) return;

    const me = (localStorage.getItem("username") || "").toString();

    const byUser = (x) => String(x?.name ?? "").includes(me);

    const clean = safeGetList("log:cleaning").filter(byUser);
    const repl  = safeGetList("log:repair").filter(byUser);
    const posts = safeGetList("log:community").filter(byUser);

    const fmtDate = (d) => {
      const dt = d ? new Date(d) : new Date();
      return isNaN(dt) ? "" : dt.toLocaleDateString();
    };
    const fmtDateTime = (d) => {
      const dt = d ? new Date(d) : new Date();
      return isNaN(dt) ? "" : dt.toLocaleString();
    };

    if (myC) {
      myC.innerHTML = clean.length ? "" : '<li class="muted">No cleaning requests yet.</li>';
      clean.forEach(x => {
        const when = fmtDate(x?.createdAt || x?.date);
        const li = document.createElement("li");
        li.innerHTML =
          `<strong>${x?.name || "—"}</strong> — "${x?.type || "Cleaning"}" on ${x?.date || when} ` +
          `<span class="badge">[${x?.status || "open"}]</span>`;
        myC.appendChild(li);
      });
    }

    if (myR) {
      myR.innerHTML = repl.length ? "" : '<li class="muted">No repair requests yet.</li>';
      repl.forEach(x => {
        const when = fmtDate(x?.createdAt);
        const li = document.createElement("li");
        li.innerHTML =
          `<strong>${x?.name || "—"}</strong> — ${x?.issue || "Issue"} ` +
          `<span class="muted">${when}</span> <span class="badge">[${x?.status || "open"}]</span>`;
        myR.appendChild(li);
      });
    }

    if (myP) {
      myP.innerHTML = posts.length ? "" : '<li class="muted">No community posts yet.</li>';
      posts.forEach(m => {
        const when = fmtDateTime(m?.createdAt);
        const body = String(m?.message || "").slice(0, 220);
        const li = document.createElement("li");
        li.innerHTML =
          `<strong>${m?.title || "Post"}</strong><br>` +
          `<span class="muted">${when}</span><p>${body}</p>`;
        myP.appendChild(li);
      });
    }
  }

  // ==== Hamburger / Nav logic ====
  function setupHamburger() {
    const btn = qs("#hamburgerBtn");
    const nav = qs("#primaryNav");
    if (!btn || !nav) return;

    const openNav = () => {
      document.body.classList.add("nav-open");
      nav.setAttribute("data-collapsed", "false");
      btn.setAttribute("aria-expanded", "true");
    };
    const closeNav = () => {
      document.body.classList.remove("nav-open");
      nav.setAttribute("data-collapsed", "true");
      btn.setAttribute("aria-expanded", "false");
    };
    const isOpen = () => nav.getAttribute("data-collapsed") === "false";

    btn.addEventListener("click", () => (isOpen() ? closeNav() : openNav()));

    // Click outside to close (mobile)
    document.addEventListener("click", (e) => {
      if (!isOpen()) return;
      const within = nav.contains(e.target) || btn.contains(e.target);
      if (!within) closeNav();
    });

    // ESC to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) closeNav();
    });

    // Reset state on resize to desktop
    const mq = window.matchMedia("(min-width: 768px)");
    mq.addEventListener?.("change", () => {
      if (mq.matches) { // desktop
        closeNav();
      }
    });

    // Close when a nav link is activated (nice on mobile)
    nav.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (a) closeNav();
    });
  }

  function boot() {
    updateWelcome();
    computeKpis();
    hydrateActivity();
    setupHamburger();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
