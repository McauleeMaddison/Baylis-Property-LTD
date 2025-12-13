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
    hydrateList(els.cleaning, cleaning, renderCleaningItem, "No cleaning requests yet.");
    hydrateList(els.repairs, repairs, renderRepairItem, "No repair requests yet.");
  }

  function renderPosts() {
    if (!els.posts) return;
    hydrateList(els.posts, state.posts, renderPostItem, "No community posts yet.");
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
      host.innerHTML = `<li class="muted">${emptyText}</li>`;
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

  function listenForFormSuccess() {
    window.addEventListener("baylis:form-success", (evt) => {
      const endpoint = evt?.detail?.endpoint;
      if (!endpoint || !formEndpoints.has(endpoint)) return;
      loadActivity();
    });
  }

  async function boot() {
    try {
      if (els.year) els.year.textContent = String(new Date().getFullYear());
      await ensureUser();
      await loadActivity();
      listenForFormSuccess();
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
