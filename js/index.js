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
    notifications: [],
    loading: false,
  };

  const fmtDate = (value, withTime = false) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return withTime ? date.toLocaleString() : date.toLocaleDateString();
  };

  async function fetchJSON(path, { method = "GET", body = null, headers = {} } = {}) {
    const opts = {
      method,
      credentials: "include",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: body ? JSON.stringify(body) : null,
    };
    const res = typeof window.fetchWithCsrf === "function"
      ? await window.fetchWithCsrf(`${API_BASE}${path}`, { apiBase: API_BASE, ...opts })
      : await fetch(`${API_BASE}${path}`, opts);
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
      state.notifications = Array.isArray(data?.notifications) ? data.notifications : [];
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
    renderNotifications();
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

  function renderNotifications() {
    const list = document.getElementById("myNotifications");
    const markAll = document.getElementById("notifMarkAll");
    if (!list) return;
    list.innerHTML = "";
    if (!state.notifications.length) {
      list.innerHTML = emptyStateHtml({
        title: "No notifications yet.",
        body: "We will show updates here when requests or posts change.",
      });
      if (markAll) markAll.disabled = true;
      return;
    }
    if (markAll) markAll.disabled = false;
    state.notifications.forEach((notif) => {
      const li = document.createElement("li");
      const isRead = Boolean(notif.readAt);
      li.className = `notification-item${isRead ? " is-read" : ""}`;
      li.innerHTML = `
        <div class="notification-title">${escapeHtml(notif.title || "Update")}</div>
        <div class="muted">${escapeHtml(notif.body || "")}</div>
        <div class="notification-meta">${formatWhen(notif.createdAt)}${isRead ? " • Read" : ""}</div>
      `;
      li.dataset.id = notif.id;
      list.appendChild(li);
    });
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
    const status = String(req.status || "open").toLowerCase();
    const sla = formatSla(req);
    const badgeClass = isOverdue(req) ? "status-overdue" : `status-${status}`;
    return `
      <div style="display:flex;justify-content:space-between;gap:.75rem;">
        <div>
          <strong>${escapeHtml(req.name || state.user?.username || "Resident")}</strong><br/>
          <span class="muted">${type}</span>
          <div class="muted">${sla}</div>
        </div>
        <div style="text-align:right;">
          <span class="muted">${fmtDate(date)}</span><br/>
          <span class="badge ${badgeClass}">[${status.replace("_", " ")}]</span>
        </div>
      </div>
    `;
  }

  function renderRepairItem(req) {
    const when = req.createdAt || Date.now();
    const status = String(req.status || "open").toLowerCase();
    const issue = req.issue || "Repair request";
    const sla = formatSla(req);
    const photos = renderPhotoStrip(req.photos || []);
    const badgeClass = isOverdue(req) ? "status-overdue" : `status-${status}`;
    return `
      <div style="display:flex;justify-content:space-between;gap:.75rem;">
        <div>
          <strong>${escapeHtml(req.name || state.user?.username || "Resident")}</strong><br/>
          <span class="muted">${escapeHtml(issue)}</span>
          <div class="muted">${sla}</div>
          ${photos}
        </div>
        <div style="text-align:right;">
          <span class="muted">${fmtDate(when)}</span><br/>
          <span class="badge ${badgeClass}">[${status.replace("_", " ")}]</span>
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

  function formatWhen(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
  }

  function renderPhotoStrip(photos) {
    if (!Array.isArray(photos) || !photos.length) return "";
    const thumbs = photos.slice(0, 3).map((src) => {
      const safe = encodeURI(src);
      return `<img src="${safe}" alt="Repair photo" loading="lazy" />`;
    }).join("");
    return `<div class="photo-strip">${thumbs}</div>`;
  }

  function formatSla(req) {
    const type = String(req.type || "").toLowerCase();
    const hours = type === "repair" ? 72 : 48;
    const created = new Date(req.createdAt || Date.now());
    if (Number.isNaN(created.getTime())) return "";
    const due = new Date(created.getTime() + hours * 60 * 60 * 1000);
    const diffMs = due.getTime() - Date.now();
    const abs = Math.abs(diffMs);
    const days = Math.floor(abs / (24 * 60 * 60 * 1000));
    const hoursLeft = Math.floor((abs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const parts = [];
    if (days) parts.push(`${days}d`);
    parts.push(`${hoursLeft}h`);
    const label = parts.join(" ");
    return diffMs >= 0 ? `SLA: ${label} left` : `SLA: ${label} overdue`;
  }

  function isOverdue(req) {
    const type = String(req.type || "").toLowerCase();
    const hours = type === "repair" ? 72 : 48;
    const created = new Date(req.createdAt || Date.now());
    if (Number.isNaN(created.getTime())) return false;
    return Date.now() > created.getTime() + hours * 60 * 60 * 1000;
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

  function bindNotificationActions() {
    const list = document.getElementById("myNotifications");
    const markAll = document.getElementById("notifMarkAll");
    if (list) {
      list.addEventListener("click", async (event) => {
        const li = event.target?.closest("li.notification-item");
        if (!li || li.classList.contains("is-read")) return;
        const id = Number(li.dataset.id);
        if (!Number.isFinite(id)) return;
        try {
          await fetchJSON("/notifications/read", { method: "POST", body: { ids: [id] } });
          li.classList.add("is-read");
        } catch (_) {}
      });
    }
    if (markAll) {
      markAll.addEventListener("click", async () => {
        try {
          await fetchJSON("/notifications/read-all", { method: "POST" });
          state.notifications = state.notifications.map((n) => ({ ...n, readAt: new Date().toISOString() }));
          renderNotifications();
        } catch (_) {}
      });
    }
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
      bindNotificationActions();
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
