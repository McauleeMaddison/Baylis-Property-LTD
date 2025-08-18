// index.js - Resident Dashboard
(() => {
  const { qs, qsa } = APP.utils;

  function updateWelcome() {
    const el = qs("#userWelcome");
    if (el) el.textContent = localStorage.getItem("username") || "Resident";
  }

  // Compute and display KPIs if present
  function kpIs() {
    const clean = APP.store.getList("log:cleaning");
    const repl  = APP.store.getList("log:repair");
    const all   = [...clean, ...repl];
    const counts = all.reduce((a, x) => {
      const s = (x.status || "open").toLowerCase();
      if (s.includes("in")) a.in_progress++;
      else if (s.includes("done")) a.done++;
      else a.open++;
      return a;
    }, { open:0, in_progress:0, done:0 });
    const posts = APP.store.getList("log:community");

    const set = (id, v) => { const n = qs(id); if (n) n.textContent = v; };
    set("#kpiOpen", counts.open);
    set("#kpiInProgress", counts.in_progress);
    set("#kpiDone", counts.done);
    set("#kpiPosts", posts.length);
  }

  // Pre-populate "My activity" lists, if page has them
  function hydrateActivity() {
    const myC = qs("#myCleaning");
    const myR = qs("#myRepairs");
    const myP = qs("#myPosts");

    if (!myC && !myR && !myP) return;

    const me = localStorage.getItem("username") || "";
    const clean = APP.store.getList("log:cleaning").filter(x => (x.name || "").includes(me));
    const repl  = APP.store.getList("log:repair").filter(x => (x.name || "").includes(me));
    const posts = APP.store.getList("log:community").filter(x => (x.name || "").includes(me));

    if (myC) {
      myC.innerHTML = clean.length ? "" : '<li class="muted">No cleaning requests yet.</li>';
      clean.forEach(x => {
        const when = new Date(x.createdAt).toLocaleDateString();
        const li = document.createElement("li");
        li.innerHTML = `<strong>${x.name || "—"}</strong> — "${x.type}" on ${x.date || when} <span class="badge">[${x.status}]</span>`;
        myC.appendChild(li);
      });
    }
    if (myR) {
      myR.innerHTML = repl.length ? "" : '<li class="muted">No repair requests yet.</li>';
      repl.forEach(x => {
        const when = new Date(x.createdAt).toLocaleDateString();
        const li = document.createElement("li");
        li.innerHTML = `<strong>${x.name || "—"}</strong> — ${x.issue} <span class="muted">${when}</span> <span class="badge">[${x.status}]</span>`;
        myR.appendChild(li);
      });
    }
    if (myP) {
      myP.innerHTML = posts.length ? "" : '<li class="muted">No community posts yet.</li>';
      posts.forEach(m => {
        const when = new Date(m.createdAt).toLocaleString();
        const li = document.createElement("li");
        li.innerHTML = `<strong>${m.title || "Post"}</strong><br><span class="muted">${when}</span><p>${(m.message||"").slice(0,220)}</p>`;
        myP.appendChild(li);
      });
    }
  }

  function boot() {
    updateWelcome();
    kpIs();
    hydrateActivity();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
