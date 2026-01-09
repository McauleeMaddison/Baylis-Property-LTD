(() => {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body || !body.classList.contains("page--resident")) return;

  const API_BASE = body.getAttribute("data-api-base") || window.API_BASE || "/api";
  const els = {
    welcome: document.getElementById("userWelcome"),
    cleaning: document.getElementById("myCleaning"),
    repairs: document.getElementById("myRepairs"),
    posts: document.getElementById("myPosts"),
    kpiOpen: document.getElementById("kpiOpen"),
    kpiProgress: document.getElementById("kpiInProgress"),
    kpiDone: document.getElementById("kpiDone"),
    kpiPosts: document.getElementById("kpiPosts"),
    year: document.getElementById("year"),
  };
  const formEndpoints = new Set(["/forms/cleaning", "/forms/repairs", "/forms/message"]);
  const TOUR_KEY = "tour:resident:v1";

  const state = {
    user: null,
    requests: [],
    posts: [],
    loading: false,
  };

  const fmtDate = (value, withTime = false) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return withTime ? date.toLocaleString() : date.toLocaleDateString();
  };

  async function fetchJSON(path, { method = "GET", body = null, headers = {} } = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: body ? JSON.stringify(body) : null,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Request failed: ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async function ensureUser() {
    const data = await fetchJSON("/auth/me");
    if (!data?.user) throw new Error("unauthorized");
    const allow = (body.getAttribute("data-required-role") || "")
      .split(",")
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean);
    const role = (data.user.role || "").toLowerCase();
    if (allow.length && !allow.includes(role)) throw new Error("unauthorized");
    state.user = data.user;
    if (els.welcome) {
      const display = data.user.profile?.displayName || data.user.email?.split("@")[0] || data.user.username || "Resident";
      els.welcome.textContent = display;
    }
    return data.user;
  }

  async function loadActivity() {
    if (state.loading) return;
    state.loading = true;
    try {
      const data = await fetchJSON("/profile/activity");
      state.requests = Array.isArray(data?.requests) ? data.requests : [];
      state.posts = Array.isArray(data?.posts) ? data.posts : [];
      renderAll();
    } catch (err) {
      showError(err.message || "Unable to load activity");
    } finally {
      state.loading = false;
    }
  }

  function showError(message) {
    [els.cleaning, els.repairs, els.posts].forEach((list) => {
      if (!list) return;
      list.innerHTML = `<li class="muted">${message}</li>`;
    });
  }

  function renderAll() {
    renderRequests();
    renderPosts();
    renderKpis();
  }

  function renderRequests() {
    if (!els.cleaning || !els.repairs) return;
    const cleaning = state.requests.filter((r) => r.type === "cleaning");
    const repairs = state.requests.filter((r) => r.type === "repair");
    hydrateList(els.cleaning, cleaning, renderCleaningItem, () => emptyStateHtml({
      title: "No cleaning requests yet.",
      body: "Schedule your first clean and we will take it from there.",
      action: { label: "New cleaning request", href: "#cleaningForm" }
    }));
    hydrateList(els.repairs, repairs, renderRepairItem, () => emptyStateHtml({
      title: "No repair requests yet.",
      body: "Report an issue and track progress from this dashboard.",
      action: { label: "New repair request", href: "#repairForm" }
    }));
  }

  function renderPosts() {
    if (!els.posts) return;
    hydrateList(els.posts, state.posts, renderPostItem, () => emptyStateHtml({
      title: "No community posts yet.",
      body: "Introduce yourself or ask a question to get the conversation started.",
      action: { label: "Post to community", href: "#communityForm" }
    }));
  }

  function renderKpis() {
    const counts = state.requests.reduce(
      (acc, req) => {
        const status = String(req.status || "open").toLowerCase();
        if (status.includes("in")) acc.inProgress += 1;
        else if (status.includes("done") || status.includes("closed")) acc.done += 1;
        else acc.open += 1;
        return acc;
      },
      { open: 0, inProgress: 0, done: 0 },
    );
    if (els.kpiOpen) els.kpiOpen.textContent = counts.open;
    if (els.kpiProgress) els.kpiProgress.textContent = counts.inProgress;
    if (els.kpiDone) els.kpiDone.textContent = counts.done;
    if (els.kpiPosts) els.kpiPosts.textContent = state.posts.length;
  }

  function hydrateList(host, items, renderFn, emptyText) {
    host.innerHTML = "";
    if (!items.length) {
      host.innerHTML = typeof emptyText === "function"
        ? emptyText()
        : `<li class="muted">${emptyText}</li>`;
      return;
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = renderFn(item);
      host.appendChild(li);
    });
  }

  function renderCleaningItem(req) {
    const date = req.date || req.createdAt;
    const type = req.cleaningType || req.type || "Cleaning";
    const status = req.status || "open";
    return `
      <div style="display:flex;justify-content:space-between;gap:.75rem;">
        <div>
          <strong>${escapeHtml(req.name || state.user?.username || "Resident")}</strong><br/>
          <span class="muted">${type}</span>
        </div>
        <div style="text-align:right;">
          <span class="muted">${fmtDate(date)}</span><br/>
          <span class="badge">[${status}]</span>
        </div>
      </div>
    `;
  }

  function renderRepairItem(req) {
    const when = req.createdAt || Date.now();
    const status = req.status || "open";
    const issue = req.issue || "Repair request";
    return `
      <div style="display:flex;justify-content:space-between;gap:.75rem;">
        <div>
          <strong>${escapeHtml(req.name || state.user?.username || "Resident")}</strong><br/>
          <span class="muted">${escapeHtml(issue)}</span>
        </div>
        <div style="text-align:right;">
          <span class="muted">${fmtDate(when)}</span><br/>
          <span class="badge">[${status}]</span>
        </div>
      </div>
    `;
  }

  function renderPostItem(post) {
    const when = fmtDate(post.createdAt || Date.now(), true);
    const title = post.title || "Post";
    const message = (post.message || "").slice(0, 240);
    return `
      <strong>${escapeHtml(title)}</strong><br/>
      <span class="muted">${when}</span>
      <p>${escapeHtml(message)}</p>
    `;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }

  function emptyStateHtml({ title, body, action }) {
    const actionHtml = action?.href
      ? `<a class="btn btn-ghost btn-small" href="${action.href}">${action.label}</a>`
      : "";
    return `
      <li class="empty-state">
        <div class="empty-title">${escapeHtml(title || "Nothing here yet.")}</div>
        <p class="muted">${escapeHtml(body || "")}</p>
        ${actionHtml}
      </li>
    `;
  }

  function listenForFormSuccess() {
    window.addEventListener("baylis:form-success", (evt) => {
      const endpoint = evt?.detail?.endpoint;
      if (!endpoint || !formEndpoints.has(endpoint)) return;
      loadActivity();
    });
  }

  function maybeStartTour() {
    try {
      if (localStorage.getItem(TOUR_KEY) === "done") return;
    } catch {
      return;
    }
    const steps = [
      {
        title: "Welcome to your resident dashboard",
        body: "Track requests, post to the community, and manage everything in one place.",
        target: ".header"
      },
      {
        title: "Submit a request",
        body: "Create cleaning or repair requests with a few quick details.",
        target: "#cleaningForm"
      },
      {
        title: "Stay on top of updates",
        body: "Your request history and community posts show up here.",
        target: "#myCleaning"
      }
    ];
    startTour(steps, TOUR_KEY);
  }

  function startTour(steps, storageKey) {
    if (!steps.length) return;
    let index = 0;
    const overlay = document.createElement("div");
    overlay.className = "tour-overlay";
    overlay.innerHTML = `
      <div class="tour-panel" role="dialog" aria-live="polite">
        <div class="tour-kicker">Quick tour</div>
        <div class="tour-title"></div>
        <p class="tour-body muted"></p>
        <div class="tour-controls">
          <button type="button" class="btn btn-ghost btn-small" data-action="back">Back</button>
          <button type="button" class="btn btn-ghost btn-small" data-action="skip">Skip</button>
          <button type="button" class="btn btn-small" data-action="next">Next</button>
        </div>
        <div class="tour-progress"></div>
      </div>
    `;
    const titleEl = overlay.querySelector(".tour-title");
    const bodyEl = overlay.querySelector(".tour-body");
    const progressEl = overlay.querySelector(".tour-progress");
    const backBtn = overlay.querySelector('[data-action="back"]');
    const nextBtn = overlay.querySelector('[data-action="next"]');

    const clearHighlight = () => {
      document.querySelectorAll(".tour-highlight").forEach((el) => el.classList.remove("tour-highlight"));
    };
    const finish = () => {
      clearHighlight();
      overlay.remove();
      try { localStorage.setItem(storageKey, "done"); } catch {}
    };
    const renderStep = () => {
      const step = steps[index];
      if (!step) return finish();
      titleEl.textContent = step.title || "";
      bodyEl.textContent = step.body || "";
      progressEl.textContent = `Step ${index + 1} of ${steps.length}`;
      backBtn.disabled = index === 0;
      nextBtn.textContent = index === steps.length - 1 ? "Finish" : "Next";
      clearHighlight();
      if (step.target) {
        const target = document.querySelector(step.target);
        if (target) {
          target.classList.add("tour-highlight");
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    };

    overlay.addEventListener("click", (event) => {
      const action = event.target?.getAttribute("data-action");
      if (!action) return;
      if (action === "skip") return finish();
      if (action === "back" && index > 0) {
        index -= 1;
        return renderStep();
      }
      if (action === "next") {
        if (index >= steps.length - 1) return finish();
        index += 1;
        return renderStep();
      }
    });
    document.body.appendChild(overlay);
    renderStep();
  }

  async function boot() {
    try {
      if (els.year) els.year.textContent = String(new Date().getFullYear());
      await ensureUser();
      await loadActivity();
      listenForFormSuccess();
      maybeStartTour();
    } catch {
      window.location.replace("/login");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
