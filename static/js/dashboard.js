(() => {
  if (typeof document === "undefined") return;

  const root = document.querySelector("[data-dashboard-page]");
  if (!root) return;

  const API_BASE = window.API_BASE || "/api";

  const els = {
    displayName: document.getElementById("dashDisplayName"),
    role: document.getElementById("dashRole"),
    subtitle: document.getElementById("dashboardSubtitle"),
    primaryPortal: document.getElementById("primaryPortalBtn"),

    open: document.getElementById("dashOpen"),
    progress: document.getElementById("dashProgress"),
    done: document.getElementById("dashDone"),
    overdue: document.getElementById("dashOverdue"),
    unread: document.getElementById("dashUnread"),
    properties: document.getElementById("dashProperties"),

    listTitle: document.getElementById("dashListTitle"),
    listHint: document.getElementById("dashListHint"),
    list: document.getElementById("dashList"),

    actionsTitle: document.getElementById("dashActionsTitle"),
    actions: document.getElementById("dashActions"),

    insightTitle: document.getElementById("dashInsightTitle"),
    insight: document.getElementById("dashInsight"),
    evidence: document.getElementById("dashEvidence"),
  };

  const state = {
    user: null,
    role: root.dataset.userRole || "",
    requests: [],
    posts: [],
    notifications: [],
    auditLogs: [],
    properties: [],
  };

  async function fetchJSON(path) {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;

      try {
        const data = await response.json();
        if (data && data.error) message = data.error;
      } catch (_) {
        // Keep default message.
      }

      throw new Error(message);
    }

    return response.json();
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }

  function formatDateTime(value) {
    if (!value) return "Unknown time";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown time";

    return date.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function statusOf(request) {
    return String(request?.status || "open").toLowerCase();
  }

  function isClosed(request) {
    return ["done", "closed"].includes(statusOf(request));
  }

  function isOverdue(request) {
    if (!request || isClosed(request)) return false;

    const type = String(request.type || "").toLowerCase();
    const maxHours = type === "repair" ? 72 : 48;
    const created = new Date(request.createdAt || Date.now());

    if (Number.isNaN(created.getTime())) return false;

    return Date.now() > created.getTime() + maxHours * 60 * 60 * 1000;
  }

  function countRequests(requests) {
    return requests.reduce(
      (summary, request) => {
        const status = statusOf(request);

        if (status === "in_progress") {
          summary.progress += 1;
        } else if (status === "done" || status === "closed") {
          summary.done += 1;
        } else {
          summary.open += 1;
        }

        if (isOverdue(request)) {
          summary.overdue += 1;
        }

        return summary;
      },
      {
        open: 0,
        progress: 0,
        done: 0,
        overdue: 0,
      }
    );
  }

  function newestFirst(a, b) {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  }

  function setMetric(element, value) {
    if (element) element.textContent = String(value);
  }

  function getDisplayName() {
    return (
      state.user?.profile?.displayName ||
      state.user?.username ||
      root.dataset.username ||
      "User"
    );
  }

  async function loadDashboard() {
    const me = await fetchJSON("/auth/me");

    if (!me || !me.user) {
      window.location.href = "/login";
      return;
    }

    state.user = me.user;
    state.role = String(me.user.role || root.dataset.userRole || "").toLowerCase();

    if (state.role === "landlord") {
      await loadLandlordData();
    } else {
      await loadResidentData();
    }

    renderDashboard();
  }

  async function loadResidentData() {
    const [activity, propertyData] = await Promise.all([
      fetchJSON("/profile/activity"),
      fetchJSON("/properties").catch(() => ({ properties: [] })),
    ]);

    state.requests = Array.isArray(activity.requests) ? activity.requests : [];
    state.posts = Array.isArray(activity.posts) ? activity.posts : [];
    state.notifications = Array.isArray(activity.notifications) ? activity.notifications : [];
    state.properties = Array.isArray(propertyData.properties) ? propertyData.properties : [];
    state.auditLogs = [];
  }

  async function loadLandlordData() {
    const [requests, posts, notifications, audit, propertyData] = await Promise.all([
      fetchJSON("/requests"),
      fetchJSON("/community").catch(() => []),
      fetchJSON("/notifications?limit=40").catch(() => ({ notifications: [] })),
      fetchJSON("/security/audit?limit=20").catch(() => ({ logs: [] })),
      fetchJSON("/properties").catch(() => ({ properties: [] })),
    ]);

    state.requests = Array.isArray(requests) ? requests : [];
    state.posts = Array.isArray(posts) ? posts : [];
    state.notifications = Array.isArray(notifications.notifications)
      ? notifications.notifications
      : [];
    state.auditLogs = Array.isArray(audit.logs) ? audit.logs : [];
    state.properties = Array.isArray(propertyData.properties) ? propertyData.properties : [];
  }

  function renderDashboard() {
    renderHero();
    renderMetrics();
    renderActivityList();
    renderActions();
    renderInsight();
    renderEvidence();
  }

  function renderHero() {
    const isLandlord = state.role === "landlord";

    if (els.displayName) els.displayName.textContent = getDisplayName();
    if (els.role) els.role.textContent = isLandlord ? "Landlord" : "Resident";

    if (els.subtitle) {
      els.subtitle.textContent = isLandlord
        ? "Manage properties, review resident requests, monitor notifications, and inspect security activity from one professional dashboard."
        : "Track your property, submit service requests, check updates, and keep connected with your building community.";
    }

    if (els.primaryPortal) {
      els.primaryPortal.href = isLandlord ? "/landlord.html" : "/resident.html";
      els.primaryPortal.textContent = isLandlord
        ? "Open Landlord Portal"
        : "Open Resident Portal";
    }
  }

  function renderMetrics() {
    const summary = countRequests(state.requests);
    const unread = state.notifications.filter((item) => !item.readAt).length;

    setMetric(els.open, summary.open);
    setMetric(els.progress, summary.progress);
    setMetric(els.done, summary.done);
    setMetric(els.overdue, summary.overdue);
    setMetric(els.unread, unread);
    setMetric(els.properties, state.properties.length);
  }

  function renderActivityList() {
    if (!els.list) return;

    const isLandlord = state.role === "landlord";
    const activeRequests = state.requests
      .slice()
      .sort(newestFirst)
      .slice(0, 6);

    els.listTitle.textContent = isLandlord
      ? "Priority request queue"
      : "My latest requests";

    els.listHint.textContent = isLandlord
      ? "Live request records from all residents."
      : "Your latest cleaning and repair records.";

    if (!activeRequests.length) {
      els.list.innerHTML = `
        <li class="dashboard-empty">
          <strong>No requests yet.</strong>
          <span>${isLandlord
            ? "Resident requests will appear here when submitted."
            : "Create your first repair or cleaning request from the resident portal."}</span>
        </li>
      `;
      return;
    }

    els.list.innerHTML = activeRequests.map((request) => {
      const status = statusOf(request).replace("_", " ");
      const type = String(request.type || "request");
      const resident = request.name || request.user || "Resident";
      const detail = request.type === "cleaning"
        ? `${request.cleaningType || "Cleaning"} • ${request.date || "No date"}`
        : request.issue || "Repair request";
      const property = request.propertyLabel || request.address || "No property selected";
      const overdue = isOverdue(request);

      return `
        <li class="dashboard-activity-item ${overdue ? "is-overdue" : ""}">
          <div>
            <div class="dashboard-activity-topline">
              <strong>${escapeHtml(type.charAt(0).toUpperCase() + type.slice(1))}</strong>
              <span class="dashboard-status-pill">${escapeHtml(status)}</span>
            </div>
            <p>${escapeHtml(detail)}</p>
            <small>
              ${isLandlord ? `${escapeHtml(resident)} • ` : ""}
              ${escapeHtml(property)} • ${escapeHtml(formatDateTime(request.createdAt))}
            </small>
          </div>
          ${overdue ? '<span class="dashboard-warning">Overdue</span>' : ""}
        </li>
      `;
    }).join("");
  }

  function renderActions() {
    if (!els.actions) return;

    const isLandlord = state.role === "landlord";

    els.actionsTitle.textContent = isLandlord
      ? "Landlord shortcuts"
      : "Resident shortcuts";

    const actions = isLandlord
      ? [
          {
            title: "Request queue",
            body: "Review, filter and update resident service requests.",
            href: "/landlord.html#allRequests",
          },
          {
            title: "Property management",
            body: "Add, rename or remove managed property records.",
            href: "/landlord.html#propertySummary",
          },
          {
            title: "Audit log",
            body: "Inspect login, request and security workflow events.",
            href: "/landlord.html#auditTableBody",
          },
          {
            title: "Community",
            body: "Review resident posts and communication.",
            href: "/community.html",
          },
        ]
      : [
          {
            title: "Submit repair",
            body: "Report a maintenance problem to your landlord.",
            href: "/resident.html#repairForm",
          },
          {
            title: "Schedule cleaning",
            body: "Create a cleaning service request.",
            href: "/resident.html#cleaningForm",
          },
          {
            title: "My property",
            body: "Select or update your property record.",
            href: "/resident.html#residentPropertySelect",
          },
          {
            title: "Community post",
            body: "Share a question or update with the building.",
            href: "/resident.html#communityForm",
          },
        ];

    els.actions.innerHTML = actions.map((action) => `
      <a class="dashboard-action-card" href="${action.href}">
        <strong>${escapeHtml(action.title)}</strong>
        <span>${escapeHtml(action.body)}</span>
      </a>
    `).join("");
  }

  function renderInsight() {
    if (!els.insight) return;

    const isLandlord = state.role === "landlord";
    const summary = countRequests(state.requests);
    const unread = state.notifications.filter((item) => !item.readAt).length;

    if (isLandlord) {
      const latestAudit = state.auditLogs[0];

      els.insightTitle.textContent = "Landlord summary";
      els.insight.innerHTML = `
        <p>
          You currently have <strong>${summary.open}</strong> open request(s),
          <strong>${summary.progress}</strong> in progress, and
          <strong>${summary.overdue}</strong> overdue.
        </p>
        <p>
          There are <strong>${state.properties.length}</strong> managed property record(s),
          <strong>${state.posts.length}</strong> community post(s), and
          <strong>${unread}</strong> unread notification(s).
        </p>
        <p>
          Latest audit event:
          <strong>${escapeHtml(latestAudit?.event || "No audit events yet")}</strong>
        </p>
      `;
      return;
    }

    const selectedPropertyId = state.user?.profile?.propertyId || "";
    const selectedProperty = state.properties.find((item) => item.id === selectedPropertyId);

    els.insightTitle.textContent = "Resident summary";
    els.insight.innerHTML = `
      <p>
        Your selected property:
        <strong>${escapeHtml(selectedProperty?.label || "Not selected yet")}</strong>
      </p>
      <p>
        You currently have <strong>${summary.open}</strong> open request(s),
        <strong>${summary.progress}</strong> in progress, and
        <strong>${summary.done}</strong> completed.
      </p>
      <p>
        You have <strong>${unread}</strong> unread notification(s) and
        <strong>${state.posts.length}</strong> community post(s).
      </p>
    `;
  }

  function renderEvidence() {
    if (!els.evidence) return;

    const isLandlord = state.role === "landlord";

    const evidence = [
      "Dashboard rendered through Flask template routing",
      "Live data loaded from Flask JSON API endpoints",
      "User role controls the dashboard content",
      "Persistent request and property records come from SQLite",
      isLandlord
        ? "Landlord view demonstrates request management and audit evidence"
        : "Resident view demonstrates request tracking and notification evidence",
    ];

    els.evidence.innerHTML = evidence
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");
  }

  function renderError(error) {
    if (els.subtitle) {
      els.subtitle.textContent = "The dashboard could not load live data. Please sign in again or restart the Flask server.";
    }

    if (els.list) {
      els.list.innerHTML = `
        <li class="dashboard-empty">
          <strong>Dashboard loading error</strong>
          <span>${escapeHtml(error.message || "Unable to load dashboard data.")}</span>
        </li>
      `;
    }
  }

  loadDashboard().catch(renderError);
})();