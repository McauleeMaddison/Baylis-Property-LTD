(() => {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body || !body.classList.contains("page--landlord")) return;

  const API_BASE = body.getAttribute("data-api-base") || window.API_BASE || "/api";
  const els = {
    welcome: document.getElementById("userWelcome"),
    year: document.getElementById("year"),
    cleaning: document.getElementById("allCleaningRequests"),
    repairs: document.getElementById("allRepairRequests"),
    posts: document.getElementById("allCommunityPosts"),
    metricOpen: document.getElementById("metricOpen"),
    metricProgress: document.getElementById("metricInProgress"),
    metricDone: document.getElementById("metricDone"),
    metricPosts: document.getElementById("metricPosts"),
    search: document.getElementById("reqSearch"),
    filterType: document.getElementById("filterType"),
    filterStatus: document.getElementById("filterStatus"),
    refreshBtn: document.getElementById("btnRefresh"),
    exportBtn: document.getElementById("btnExport"),
    auditBody: document.getElementById("auditTableBody"),
    auditRefresh: document.getElementById("auditRefreshBtn"),
  };

  const state = {
    user: null,
    requests: [],
    posts: [],
    auditLogs: [],
  };

  const toast = (text) => {
    if (typeof window.showToast === "function") window.showToast(text);
    else alert(text);
  };

  function fmtDate(value) {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
  }

  async function fetchJSON(path, { method = "GET", body = null, headers = {} } = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: body ? JSON.stringify(body) : null,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Request failed (${res.status})`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async function ensureLandlord() {
    const data = await fetchJSON("/auth/me");
    if (!data?.user) throw new Error("unauthorized");
    const role = (data.user.role || "").toLowerCase();
    if (role !== "landlord") throw new Error("unauthorized");
    state.user = data.user;
    if (els.welcome) {
      const display = data.user.profile?.displayName || data.user.email || "Landlord";
      els.welcome.textContent = display;
    }
  }

  async function loadDashboard() {
    try {
      const [requests, posts, audit] = await Promise.all([
        fetchJSON("/requests"),
        fetchJSON("/community"),
        fetchJSON("/security/audit?limit=50").catch(() => ({ logs: [] }))
      ]);
      state.requests = Array.isArray(requests) ? requests : [];
      state.posts = Array.isArray(posts) ? posts : [];
      state.auditLogs = Array.isArray(audit?.logs) ? audit.logs : [];
      render();
    } catch (err) {
      showError(err.message || "Unable to load data");
    }
  }

  function showError(message) {
    [els.cleaning, els.repairs, els.posts].forEach((list) => {
      if (!list) return;
      list.innerHTML = `<li class="muted">${message}</li>`;
    });
  }

  function render() {
    renderRequests();
    renderCommunity();
    renderMetrics();
    renderAudit();
  }

  function getFilteredRequests() {
    const search = (els.search?.value || "").toLowerCase().trim();
    const type = els.filterType?.value || "all";
    const status = (els.filterStatus?.value || "all").toLowerCase();
    return state.requests.filter((req) => {
      const reqStatus = String(req.status || "open").toLowerCase();
      const matchesType = type === "all" || req.type === type;
      const matchesStatus = status === "all" || reqStatus.includes(status);
      const haystack = `${req.name || ""} ${req.issue || ""} ${req.cleaningType || ""} ${req.address || ""}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      return matchesType && matchesStatus && matchesSearch;
    });
  }

  function renderRequests() {
    if (!els.cleaning || !els.repairs) return;
    const filtered = getFilteredRequests();
    const cleaning = filtered.filter((r) => r.type === "cleaning");
    const repairs = filtered.filter((r) => r.type === "repair");
    hydrateList(els.cleaning, cleaning, renderCleaningItem, "No cleaning requests found.");
    hydrateList(els.repairs, repairs, renderRepairItem, "No repair requests found.");
  }

  function renderCommunity() {
    if (!els.posts) return;
    hydrateList(els.posts, state.posts, renderCommunityItem, "No community posts yet.");
  }

  function renderMetrics() {
    const filtered = getFilteredRequests();
    const summary = filtered.reduce(
      (acc, req) => {
        const status = String(req.status || "open").toLowerCase();
        if (status.includes("in")) acc.inProgress += 1;
        else if (status.includes("done") || status.includes("closed")) acc.done += 1;
        else acc.open += 1;
        return acc;
      },
      { open: 0, inProgress: 0, done: 0 },
    );
    if (els.metricOpen) els.metricOpen.textContent = summary.open;
    if (els.metricProgress) els.metricProgress.textContent = summary.inProgress;
    if (els.metricDone) els.metricDone.textContent = summary.done;
    if (els.metricPosts) els.metricPosts.textContent = state.posts.length;
  }

  function hydrateList(host, items, renderFn, emptyMsg) {
    host.innerHTML = "";
    if (!items.length) {
      host.innerHTML = `<li class="muted">${emptyMsg}</li>`;
      return;
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = renderFn(item);
      host.appendChild(li);
    });
  }

  function renderCleaningItem(req) {
    const status = req.status || "open";
    return `
      <div>
        <div><strong data-field="name">${escapeHtml(req.name || "Resident")}</strong></div>
        <div class="muted" data-field="info">${escapeHtml(req.cleaningType || req.type || "Cleaning")}</div>
        <div class="muted" data-field="date">${fmtDate(req.date || req.createdAt)}</div>
        <span class="badge">Status: ${escapeHtml(status)}</span>
      </div>
    `;
  }

  function renderRepairItem(req) {
    const status = req.status || "open";
    return `
      <div>
        <div><strong data-field="name">${escapeHtml(req.name || "Resident")}</strong></div>
        <div class="muted" data-field="info">${escapeHtml(req.issue || "Repair request")}</div>
        <div class="muted" data-field="date">${fmtDate(req.createdAt)}</div>
        <span class="badge">Status: ${escapeHtml(status)}</span>
      </div>
    `;
  }

  function renderCommunityItem(post) {
    const when = fmtDate(post.createdAt) || "";
    const comments = Array.isArray(post.comments) ? post.comments.length : 0;
    return `
      <div>
        <strong>${escapeHtml(post.title || "Post")}</strong>
        <div class="muted">${escapeHtml(post.author || "Anon")} • ${when}</div>
        <p>${escapeHtml((post.message || "").slice(0, 240))}</p>
        <span class="badge">${comments} comments</span>
      </div>
    `;
  }

  function renderAudit() {
    if (!els.auditBody) return;
    els.auditBody.innerHTML = "";
    if (!state.auditLogs.length) {
      els.auditBody.innerHTML = `<tr><td colspan="4" class="muted">No audit events yet.</td></tr>`;
      return;
    }
    state.auditLogs.forEach((log) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(fmtDateTime(log.createdAt))}</td>
        <td><strong>${escapeHtml(log.event || "event")}</strong></td>
        <td><span class="badge">${escapeHtml((log.severity || "info").toUpperCase())}</span></td>
        <td>${escapeHtml(formatAuditDetails(log))}</td>
      `;
      els.auditBody.appendChild(tr);
    });
  }

  function fmtDateTime(value) {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
  }

  function formatAuditDetails(log) {
    const parts = [];
    if (log.userId) parts.push(`User #${log.userId}`);
    const meta = log.metadata || {};
    Object.keys(meta).forEach((key) => {
      if (meta[key] === undefined || meta[key] === null) return;
      const val = typeof meta[key] === "object" ? JSON.stringify(meta[key]) : String(meta[key]);
      parts.push(`${key}: ${val}`);
    });
    return parts.length ? parts.join(" • ") : "—";
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }

  function exportCsv() {
    const rows = [["Type", "Name", "Details", "Date", "Status"]];
    getFilteredRequests().forEach((req) => {
      rows.push([
        req.type,
        req.name || "",
        req.type === "cleaning" ? (req.cleaningType || "") : (req.issue || ""),
        fmtDate(req.date || req.createdAt),
        req.status || "open",
      ]);
    });
    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");
            return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `baylis-requests-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function bindEvents() {
    els.search?.addEventListener("input", render);
    els.filterType?.addEventListener("change", render);
    els.filterStatus?.addEventListener("change", render);
    els.refreshBtn?.addEventListener("click", () => loadDashboard());
    els.exportBtn?.addEventListener("click", exportCsv);
    els.auditRefresh?.addEventListener("click", refreshAuditLog);
  }

  async function refreshAuditLog() {
    if (!els.auditRefresh) return;
    els.auditRefresh.disabled = true;
    try {
      const audit = await fetchJSON("/security/audit?limit=50").catch(() => ({ logs: [] }));
      state.auditLogs = Array.isArray(audit?.logs) ? audit.logs : [];
      renderAudit();
      toast("🔐 Audit log refreshed.");
    } catch (err) {
      toast(err.message || "Unable to refresh audit log.");
    } finally {
      els.auditRefresh.disabled = false;
    }
  }

  async function boot() {
    try {
      if (els.year) els.year.textContent = String(new Date().getFullYear());
      await ensureLandlord();
      bindEvents();
      await loadDashboard();
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
