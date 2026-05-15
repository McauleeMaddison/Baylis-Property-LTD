(() => {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body || !body.classList.contains("page--landlord")) return;

  const API_BASE = body.getAttribute("data-api-base") || window.API_BASE || "/api";
  const TOUR_KEY = "tour:landlord:v1";

  const els = {
    welcome: document.getElementById("userWelcome"),
    year: document.getElementById("year"),
    requests: document.getElementById("allRequests"),
    propertySummary: document.getElementById("propertySummary"),
    propertyAdd: document.getElementById("propertyAddBtn"),
    posts: document.getElementById("allCommunityPosts"),
    notifications: document.getElementById("landlordNotifications"),
    notifMarkAll: document.getElementById("landlordNotifMarkAll"),
    metricOpen: document.getElementById("metricOpen"),
    metricProgress: document.getElementById("metricInProgress"),
    metricDone: document.getElementById("metricDone"),
    metricOverdue: document.getElementById("metricOverdue"),
    metricPosts: document.getElementById("metricPosts"),
    search: document.getElementById("reqSearch"),
    filterType: document.getElementById("filterType"),
    filterStatus: document.getElementById("filterStatus"),
    filterProperty: document.getElementById("filterProperty"),
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
    notifications: [],
    properties: [],
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

  function fmtDateTime(value) {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
  }

  async function fetchJSON(path, { method = "GET", body = null, headers = {} } = {}) {
    const getCsrfToken = () => {
      const match = document.cookie.match(/(?:^|;)\s*csrfToken=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : "";
    };
    const ensureCsrf = async () => {
      if (getCsrfToken()) return;
      try {
        await fetch(`${API_BASE}/security/csrf`, { credentials: "include" });
      } catch (_) {}
    };

    if (method !== "GET") {
      await ensureCsrf();
      const token = getCsrfToken();
      if (token && !headers["X-CSRF-Token"] && !headers["x-csrf-token"]) {
        headers = Object.assign({ "X-CSRF-Token": token }, headers);
      }
    }

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
      let message = text || `Request failed (${res.status})`;
      if (text) {
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error) message = parsed.error;
        } catch (_) {}
      }
      throw new Error(message);
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

  function normalizeRequest(req) {
    const propertyId = String(req?.propertyId || "").trim();
    const propertyLabel = String(req?.propertyLabel || req?.address || "Unmapped property").trim() || "Unmapped property";
    return Object.assign({}, req, { propertyId, propertyLabel });
  }

  function renderPropertyFilter() {
    if (!els.filterProperty) return;
    const previous = els.filterProperty.value || "all";
    const hasUnmapped = state.requests.some((req) => !req.propertyId);
    const options = ['<option value="all">All properties</option>']
      .concat(state.properties.map((property) => `<option value="${property.id}">${escapeHtml(property.label)}</option>`));
    if (hasUnmapped) {
      options.push('<option value="__unmapped">Unmapped properties</option>');
    }
    els.filterProperty.innerHTML = options.join("");
    const hasPrevious = Array.from(els.filterProperty.options).some((opt) => opt.value === previous);
    els.filterProperty.value = hasPrevious ? previous : "all";
  }

  async function loadDashboard() {
    try {
      const [requests, posts, audit, notifications, propertyData] = await Promise.all([
        fetchJSON("/requests"),
        fetchJSON("/community"),
        fetchJSON("/security/audit?limit=50").catch(() => ({ logs: [] })),
        fetchJSON("/notifications?limit=40").catch(() => ({ notifications: [] })),
        fetchJSON("/properties").catch(() => ({ properties: [] })),
      ]);

      state.requests = Array.isArray(requests) ? requests.map(normalizeRequest) : [];
      state.posts = Array.isArray(posts) ? posts : [];
      state.auditLogs = Array.isArray(audit?.logs) ? audit.logs : [];
      state.notifications = Array.isArray(notifications?.notifications) ? notifications.notifications : [];
      state.properties = Array.isArray(propertyData?.properties) ? propertyData.properties : [];

      renderPropertyFilter();
      render();
    } catch (err) {
      showError(err.message || "Unable to load data");
    }
  }

  function showError(message) {
    [els.requests, els.posts, els.propertySummary].forEach((list) => {
      if (!list) return;
      list.innerHTML = `<li class="muted">${escapeHtml(message)}</li>`;
    });
  }

  function getFilteredRequests() {
    const search = (els.search?.value || "").toLowerCase().trim();
    const type = (els.filterType?.value || "all").toLowerCase();
    const status = (els.filterStatus?.value || "all").toLowerCase();
    const property = (els.filterProperty?.value || "all").toLowerCase();

    return state.requests.filter((req) => {
      const reqStatus = String(req.status || "open").toLowerCase();
      const matchesType = type === "all" || String(req.type || "").toLowerCase() === type;
      const matchesStatus = status === "all" || reqStatus === status;
      const matchesProperty = property === "all"
        ? true
        : property === "__unmapped"
          ? !req.propertyId
          : req.propertyId === property;
      const haystack = `${req.name || ""} ${req.issue || ""} ${req.cleaningType || ""} ${req.propertyLabel || ""} ${req.address || ""}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      return matchesType && matchesStatus && matchesProperty && matchesSearch;
    });
  }

  function render() {
    renderRequests();
    renderPropertySummary();
    renderCommunity();
    renderMetrics();
    renderAudit();
    renderNotifications();
  }

  function renderRequests() {
    if (!els.requests) return;
    const filtered = getFilteredRequests().slice().sort((a, b) => {
      const byProperty = String(a.propertyLabel || "").localeCompare(String(b.propertyLabel || ""));
      if (byProperty) return byProperty;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    hydrateList(els.requests, filtered, renderRequestItem, () => emptyStateHtml({
      title: "No requests match your filters.",
      body: "Clear filters or refresh the dashboard to fetch the latest requests.",
      actions: [
        { label: "Clear filters", action: "clear-filters" },
        { label: "Refresh", action: "refresh" }
      ]
    }));
  }

  function renderRequestItem(req) {
    const status = String(req.status || "open").toLowerCase();
    const badgeClass = isOverdue(req) ? "status-overdue" : `status-${status}`;
    const detail = req.type === "cleaning"
      ? `${req.cleaningType || "Cleaning"} • ${fmtDate(req.date || req.createdAt)}`
      : (req.issue || "Repair request");
    const photos = req.type === "repair" ? renderPhotoStrip(req.photos || []) : "";
    const typeClass = req.type === "cleaning" ? "request-entry--cleaning" : "request-entry--repair";

    return `
      <div class="request-entry request-entry--landlord ${typeClass}">
        <div class="section-row">
          <strong>${escapeHtml(req.name || "Resident")}</strong>
          <span class="chip ${req.type === "cleaning" ? "cleaning" : "repair"}">${escapeHtml(req.type || "request")}</span>
        </div>
        <div class="request-entry-property">${escapeHtml(req.propertyLabel || "Unmapped property")}</div>
        <div class="request-entry-detail">${escapeHtml(detail)}</div>
        <div class="request-entry-detail">${formatSla(req)}</div>
        ${photos}
        <div class="request-actions">
          <span class="badge ${badgeClass}">Status: ${escapeHtml(status.replace("_", " "))}</span>
          ${renderStatusSelect(req)}
        </div>
      </div>
    `;
  }

  function renderPropertySummary() {
    if (!els.propertySummary) return;
    const countsById = new Map();
    state.properties.forEach((property) => {
      countsById.set(property.id, { open: 0, inProgress: 0, done: 0, total: 0, label: property.label });
    });

    let unmapped = { open: 0, inProgress: 0, done: 0, total: 0, label: "Unmapped properties" };

    state.requests.forEach((req) => {
      const status = String(req.status || "open").toLowerCase();
      const bucket = req.propertyId && countsById.has(req.propertyId)
        ? countsById.get(req.propertyId)
        : unmapped;
      bucket.total += 1;
      if (status === "in_progress") bucket.inProgress += 1;
      else if (status === "done" || status === "closed") bucket.done += 1;
      else bucket.open += 1;
    });

    const cards = [];
    state.properties.forEach((property) => {
      const stats = countsById.get(property.id) || { open: 0, inProgress: 0, done: 0, total: 0, label: property.label };
      cards.push({ id: property.id, label: property.label, stats });
    });
    if (unmapped.total > 0) {
      cards.push({ id: "__unmapped", label: unmapped.label, stats: unmapped });
    }

    if (!cards.length) {
      els.propertySummary.innerHTML = emptyStateHtml({
        title: "No properties configured.",
        body: "Add properties to begin routing requests by address.",
        actions: [{ label: "Refresh", action: "refresh" }]
      });
      return;
    }

    els.propertySummary.innerHTML = "";
    cards.forEach((card) => {
      const li = document.createElement("li");
      const selected = (els.filterProperty?.value || "all") === card.id;
      const isMappedProperty = card.id !== "__unmapped";
      li.innerHTML = `
        <div>
          <div class="section-row">
            <strong>${escapeHtml(card.label)}</strong>
            <span class="badge">${card.stats.total} total</span>
          </div>
          <div class="muted">Open ${card.stats.open} • In progress ${card.stats.inProgress} • Done ${card.stats.done}</div>
          <div class="property-summary-actions">
            <button type="button" class="btn btn-ghost btn-small" data-action="filter-property" data-property-id="${card.id}">${selected ? "Clear filter" : "View requests"}</button>
            ${isMappedProperty ? `<button type="button" class="btn btn-ghost btn-small" data-action="edit-property" data-property-id="${card.id}">Edit</button>` : ""}
            ${isMappedProperty ? `<button type="button" class="btn btn-ghost btn-small" data-action="delete-property" data-property-id="${card.id}">Delete</button>` : ""}
          </div>
        </div>
      `;
      els.propertySummary.appendChild(li);
    });
  }

  function renderCommunity() {
    if (!els.posts) return;
    hydrateList(els.posts, state.posts, renderCommunityItem, () => emptyStateHtml({
      title: "No community posts yet.",
      body: "When residents post updates or questions, they will appear here.",
      actions: [{ label: "Refresh", action: "refresh" }]
    }));
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

  function renderMetrics() {
    const filtered = getFilteredRequests();
    const summary = filtered.reduce(
      (acc, req) => {
        const status = String(req.status || "open").toLowerCase();
        if (isOverdue(req)) acc.overdue += 1;
        if (status === "in_progress") acc.inProgress += 1;
        else if (status === "done" || status === "closed") acc.done += 1;
        else acc.open += 1;
        return acc;
      },
      { open: 0, inProgress: 0, done: 0, overdue: 0 }
    );

    if (els.metricOpen) els.metricOpen.textContent = summary.open;
    if (els.metricProgress) els.metricProgress.textContent = summary.inProgress;
    if (els.metricDone) els.metricDone.textContent = summary.done;
    if (els.metricOverdue) els.metricOverdue.textContent = summary.overdue;
    if (els.metricPosts) els.metricPosts.textContent = state.posts.length;
  }

  function renderNotifications() {
    if (!els.notifications) return;
    els.notifications.innerHTML = "";

    if (!state.notifications.length) {
      els.notifications.innerHTML = emptyStateHtml({
        title: "No notifications yet.",
        body: "Updates about new requests and comments will appear here.",
        actions: [{ label: "Refresh", action: "refresh" }]
      });
      if (els.notifMarkAll) els.notifMarkAll.disabled = true;
      return;
    }

    if (els.notifMarkAll) els.notifMarkAll.disabled = false;
    state.notifications.forEach((notif) => {
      const li = document.createElement("li");
      const isRead = Boolean(notif.readAt);
      li.className = `notification-item${isRead ? " is-read" : ""}`;
      li.dataset.id = notif.id;
      li.innerHTML = `
        <div class="notification-title">${escapeHtml(notif.title || "Update")}</div>
        <div class="muted">${escapeHtml(notif.body || "")}</div>
        <div class="notification-meta">${escapeHtml(fmtDateTime(notif.createdAt))}${isRead ? " • Read" : ""}</div>
      `;
      els.notifications.appendChild(li);
    });
  }

  function renderAudit() {
    if (!els.auditBody) return;
    els.auditBody.innerHTML = "";

    if (!state.auditLogs.length) {
      els.auditBody.innerHTML = '<tr><td colspan="4" class="muted">No audit events yet.</td></tr>';
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

  function hydrateList(host, items, renderFn, emptyHtml) {
    host.innerHTML = "";
    if (!items.length) {
      host.innerHTML = typeof emptyHtml === "function" ? emptyHtml() : `<li class="muted">${escapeHtml(String(emptyHtml || ""))}</li>`;
      return;
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = renderFn(item);
      host.appendChild(li);
    });
  }

  function renderStatusSelect(req) {
    const current = String(req.status || "open").toLowerCase();
    return `
      <select class="status-select" data-request-id="${req.id}" aria-label="Update status">
        <option value="open"${current === "open" ? " selected" : ""}>Open</option>
        <option value="in_progress"${current === "in_progress" ? " selected" : ""}>In progress</option>
        <option value="done"${current === "done" ? " selected" : ""}>Done</option>
      </select>
    `;
  }

  function renderPhotoStrip(photos) {
    if (!Array.isArray(photos) || !photos.length) return "";
    const thumbs = photos.slice(0, 3).map((src) => `<img src="${encodeURI(src)}" alt="Repair photo" loading="lazy" />`).join("");
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

  function emptyStateHtml({ title, body, actions = [] }) {
    const buttons = actions
      .map((btn) => `<button type="button" class="btn btn-ghost btn-small" data-action="${btn.action}">${btn.label}</button>`)
      .join("");
    return `
      <li class="empty-state">
        <div class="empty-title">${escapeHtml(title || "Nothing here yet.")}</div>
        <p class="muted">${escapeHtml(body || "")}</p>
        <div class="empty-actions">${buttons}</div>
      </li>
    `;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }

  function exportCsv() {
    const rows = [["Property", "Type", "Resident", "Details", "Date", "Status"]];
    getFilteredRequests().forEach((req) => {
      rows.push([
        req.propertyLabel || "",
        req.type || "",
        req.name || "",
        req.type === "cleaning" ? (req.cleaningType || "") : (req.issue || ""),
        fmtDate(req.date || req.createdAt),
        req.status || "open",
      ]);
    });

    const csv = rows
      .map((row) => row
        .map((value) => {
          const text = String(value ?? "");
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(","))
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
    els.filterProperty?.addEventListener("change", render);
    els.refreshBtn?.addEventListener("click", () => loadDashboard());
    els.exportBtn?.addEventListener("click", exportCsv);
    els.auditRefresh?.addEventListener("click", refreshAuditLog);
    els.notifMarkAll?.addEventListener("click", markAllNotificationsRead);

    bindStatusEvents();
    bindEmptyActions();
    bindPropertySummaryActions();
    bindPropertyAdminActions();
  }

  function bindStatusEvents() {
    els.requests?.addEventListener("change", async (event) => {
      const select = event.target?.closest("select.status-select");
      if (!select) return;
      const id = select.getAttribute("data-request-id");
      const status = select.value;
      if (!id) return;
      try {
        const updated = await fetchJSON(`/requests/${id}/status`, { method: "POST", body: { status } });
        const idx = state.requests.findIndex((r) => String(r.id) === String(id));
        if (idx >= 0 && updated) state.requests[idx] = normalizeRequest(updated);
        render();
      } catch (err) {
        toast(err.message || "Unable to update status.");
      }
    });
  }

  function bindEmptyActions() {
    const handler = (event) => {
      const action = event.target?.getAttribute("data-action");
      if (!action) return;
      if (action === "clear-filters") {
        if (els.search) els.search.value = "";
        if (els.filterType) els.filterType.value = "all";
        if (els.filterStatus) els.filterStatus.value = "all";
        if (els.filterProperty) els.filterProperty.value = "all";
        render();
        return;
      }
      if (action === "refresh") loadDashboard();
    };

    [els.requests, els.posts, els.notifications, els.propertySummary].forEach((list) => {
      list?.addEventListener("click", handler);
    });
  }

  function bindPropertySummaryActions() {
    els.propertySummary?.addEventListener("click", async (event) => {
      const button = event.target?.closest("button[data-action]");
      if (!button) return;
      const action = button.getAttribute("data-action");
      const propertyId = button.getAttribute("data-property-id") || "";
      if (!action || !propertyId) return;

      if (action === "filter-property") {
        if (!els.filterProperty) return;
        els.filterProperty.value = els.filterProperty.value === propertyId ? "all" : propertyId;
        render();
        return;
      }

      if (action === "edit-property") {
        await editProperty(propertyId);
        return;
      }

      if (action === "delete-property") {
        await deleteProperty(propertyId);
      }
    });
  }

  function bindPropertyAdminActions() {
    els.propertyAdd?.addEventListener("click", async () => {
      await createProperty();
    });
  }

  async function createProperty() {
    const label = window.prompt("Enter the full property address");
    if (label === null) return;
    const normalized = String(label || "").replace(/\s+/g, " ").trim();
    if (!normalized) {
      toast("Property label is required.");
      return;
    }
    try {
      await fetchJSON("/properties", { method: "POST", body: { label: normalized } });
      await loadDashboard();
      toast("Property added.");
    } catch (err) {
      toast(err.message || "Unable to add property.");
    }
  }

  async function editProperty(propertyId) {
    const property = state.properties.find((p) => String(p.id) === String(propertyId));
    if (!property) {
      toast("Property not found.");
      return;
    }
    const nextLabel = window.prompt("Update property address", property.label || "");
    if (nextLabel === null) return;
    const normalized = String(nextLabel || "").replace(/\s+/g, " ").trim();
    if (!normalized) {
      toast("Property label is required.");
      return;
    }
    if (normalized === String(property.label || "").trim()) return;
    try {
      await fetchJSON(`/properties/${encodeURIComponent(propertyId)}`, { method: "PATCH", body: { label: normalized } });
      await loadDashboard();
      toast("Property updated.");
    } catch (err) {
      toast(err.message || "Unable to update property.");
    }
  }

  async function deleteProperty(propertyId) {
    const property = state.properties.find((p) => String(p.id) === String(propertyId));
    if (!property) {
      toast("Property not found.");
      return;
    }
    const confirmed = window.confirm(`Delete property?\n\n${property.label}\n\nThis cannot be undone.`);
    if (!confirmed) return;
    try {
      await fetchJSON(`/properties/${encodeURIComponent(propertyId)}`, { method: "DELETE" });
      if (els.filterProperty?.value === propertyId) {
        els.filterProperty.value = "all";
      }
      await loadDashboard();
      toast("Property deleted.");
    } catch (err) {
      toast(err.message || "Unable to delete property.");
    }
  }

  async function markAllNotificationsRead() {
    try {
      await fetchJSON("/notifications/read-all", { method: "POST" });
      state.notifications = state.notifications.map((n) => Object.assign({}, n, { readAt: new Date().toISOString() }));
      renderNotifications();
    } catch (err) {
      toast(err.message || "Unable to mark notifications.");
    }
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

  function maybeStartTour() {
    try {
      if (localStorage.getItem(TOUR_KEY) === "done") return;
    } catch {
      return;
    }

    const steps = [
      {
        title: "Welcome to your landlord dashboard",
        body: "Manage requests across all properties from one streamlined queue.",
        target: ".header"
      },
      {
        title: "Filter by property",
        body: "Use property, type, and status filters to focus on the right work.",
        target: "#filterProperty"
      },
      {
        title: "Property overview",
        body: "See request volume by property before diving into individual jobs.",
        target: "#propertySummary"
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
      try {
        localStorage.setItem(storageKey, "done");
      } catch (_) {}
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
      await ensureLandlord();
      bindEvents();
      await loadDashboard();
      maybeStartTour();
    } catch (_) {
      window.location.replace("/login");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
