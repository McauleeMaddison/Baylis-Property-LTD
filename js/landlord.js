// js/landlord.js
(function () {
  "use strict";

  // ---------- Small helpers ----------
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const toast = (t) => (typeof window.showToast === "function" ? window.showToast(t) : alert(t));
  const CSS_ESCAPE = (window.CSS && CSS.escape) ? (s) => CSS.escape(String(s)) : (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, (ch) => "\\" + ch);
  const debounce = (fn, wait = 200) => {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  };

  const API_BASE = (document.body?.getAttribute("data-api-base") || window.API_BASE || "/api");
  const HAS_APP_STORE = !!(window.APP && APP.store && typeof APP.store.getList === "function");

  const STATUS = { open: "Open", in_progress: "In Progress", done: "Done" };
  const prettyStatus = (s) => (s === "in_progress" ? "In Progress" : (s?.charAt(0).toUpperCase() + s?.slice(1)));

  // DOM refs (all optional; code guards each)
  let ulClean, ulRepair, ulPosts,
      metricOpen, metricInProgress, metricDone, metricPosts,
      search, filterType, filterStatus, btnRefresh, btnExport,
      kanban;

  // Canonical in-memory list of requests
  let allRequests = [];
  let currentFilter = { q: "", type: "all", status: "all" };

  // ---------- Boot ----------
  window.addEventListener("DOMContentLoaded", async () => {
    // Gather refs
    ulClean  = $("#allCleaningRequests");
    ulRepair = $("#allRepairRequests");
    ulPosts  = $("#allCommunityPosts");

    metricOpen = $("#metricOpen");
    metricInProgress = $("#metricInProgress");
    metricDone = $("#metricDone");
    metricPosts = $("#metricPosts");

    search = $("#reqSearch");
    filterType = $("#filterType");
    filterStatus = $("#filterStatus");
    btnRefresh = $("#btnRefresh");
    btnExport  = $("#btnExport");

    // Ensure Kanban host exists
    ensureKanbanSection();
    ensureKanbanStyles();

    // Wire events
    search?.addEventListener("input", debounce(() => { currentFilter.q = (search.value || "").toLowerCase(); renderAll(); }, 120));
    filterType?.addEventListener("change", () => { currentFilter.type = filterType.value || "all"; renderAll(); });
    filterStatus?.addEventListener("change", () => { currentFilter.status = filterStatus.value || "all"; renderAll(); });
    btnRefresh?.addEventListener("click", async () => { await fetchRequests(true); renderAll(); toast("🔄 Refreshed"); });
    btnExport?.addEventListener("click", exportCSV);

    // Initial fetch + render
    await fetchRequests(false);
    renderAll();

    // Posts metric
    await updatePostsMetric();
  });

  // ---------- Data sources: APP.store → API → DOM harvest ----------
  async function fetchRequests(force) {
    // 1) Try local APP.store first (preferred for offline and instant UX)
    if (HAS_APP_STORE) {
      const localReqs = readFromAppStore();
      if (localReqs.length) {
        allRequests = localReqs;
        if (force) populateListsFromState(); // refresh the ULs if asked
        return;
      }
    }

    // 2) Try API
    const apiRes = await readFromAPI();
    if (apiRes.length) {
      allRequests = apiRes;
      if (force || isLoadingList(ulClean) || isLoadingList(ulRepair)) populateListsFromState();
      return;
    }

    // 3) Fallback: harvest from existing ULs
    const harvested = harvestFromLists();
    if (harvested.length) {
      allRequests = harvested;
      return;
    }

    // 4) Final fallback: empty
    allRequests = [];
  }

  function readFromAppStore() {
    try {
      const clean = APP.store.getList("log:cleaning") || [];
      const repair = APP.store.getList("log:repair") || [];
      const normC = clean.map((x, i) => normalizeReq({
        id: x.id || `c_${x.createdAt || Date.now()}_${i}`,
        type: "cleaning",
        name: x.name || "Unknown",
        cleaningType: x.type || x.cleaningType || "",
        date: x.date || "",
        status: x.status || "open"
      }));
      const normR = repair.map((x, i) => normalizeReq({
        id: x.id || `r_${x.createdAt || Date.now()}_${i}`,
        type: "repair",
        name: x.name || "Unknown",
        issue: x.issue || "",
        status: x.status || "open"
      }));
      return [...normC, ...normR];
    } catch { return []; }
  }

  async function readFromAPI() {
    try {
      const res = await authedFetch("/requests", { method: "GET" });
      if (!res || !res.ok) return [];
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map(normalizeReq);
    } catch { return []; }
  }

  async function updatePostsMetric() {
    // Prefer APP.store community data if present
    if (metricPosts) {
      if (HAS_APP_STORE) {
        try {
          const posts = APP.store.getList("log:community") || [];
          metricPosts.textContent = String(posts.length);
          return;
        } catch {}
      }
      // else try API
      try {
        const res = await authedFetch("/posts", { method: "GET" });
        if (res?.ok) {
          const posts = await res.json();
          metricPosts.textContent = String(Array.isArray(posts) ? posts.length : 0);
          return;
        }
      } catch {}
      // else fallback to DOM list
      metricPosts.textContent = String(ulPosts?.children?.length || 0);
    }
  }

  // ---------- Rendering ----------
  function renderAll() {
    const filtered = applyFilters(allRequests, currentFilter);
    renderKanban(filtered);
    recomputeMetrics(filtered);
  }

  function populateListsFromState() {
    if (ulClean) ulClean.innerHTML = "";
    if (ulRepair) ulRepair.innerHTML = "";

    allRequests.forEach((r) => {
      const li = document.createElement("li");
      li.className = "animated";
      li.dataset.id = r.id;
      li.dataset.type = r.type;
      li.dataset.status = r.status;

      if (r.type === "cleaning") {
        li.innerHTML = `🧼 <strong>${escapeHtml(r.name)}</strong> — "<em>${escapeHtml(r.cleaningType || "")}</em>" ${r.date ? "on " + escapeHtml(r.date) : ""}
          <span class="badge">Status: ${prettyStatus(r.status)}</span>`;
        ulClean?.appendChild(li);
      } else {
        li.innerHTML = `🛠️ <strong>${escapeHtml(r.name)}</strong> — ${escapeHtml(r.issue || "Issue")}
          <span class="badge">Status: ${prettyStatus(r.status)}</span>`;
        ulRepair?.appendChild(li);
      }
    });
  }

  function renderKanban(requests) {
    if (!kanban) return;
    kanban.innerHTML = "";

    const columns = [
      { key: "open",        title: STATUS.open },
      { key: "in_progress", title: STATUS.in_progress },
      { key: "done",        title: STATUS.done }
    ];

    // Create columns
    columns.forEach((col) => {
      const wrap = document.createElement("div");
      wrap.className = "kanban-col";
      wrap.dataset.status = col.key;
      wrap.innerHTML = `
        <div class="kanban-header">
          <h4>${col.title}</h4>
          <span class="pill" id="count-${col.key}">0</span>
        </div>
        <div class="kanban-list" data-status="${col.key}" role="list" aria-label="${col.title}"></div>
      `;
      kanban.appendChild(wrap);
    });

    // Group and insert cards
    const byStatus = groupBy(requests, (r) => r.status || "open");
    Object.entries(byStatus).forEach(([status, list]) => {
      const host = kanban.querySelector(`.kanban-list[data-status="${CSS_ESCAPE(status)}"]`);
      const countEl = $("#count-" + status);
      if (!host) return;
      list.forEach((r) => host.appendChild(makeCard(r)));
      if (countEl) countEl.textContent = String(list.length);
    });

    enableDnD();
  }

  function makeCard(r) {
    const card = document.createElement("div");
    card.className = "kanban-card";
    card.tabIndex = 0;
    card.draggable = true;

    card.dataset.id = r.id;
    card.dataset.type = r.type;
    card.dataset.status = r.status;

    const label = r.type === "cleaning"
      ? `🧼 ${r.name} — "${r.cleaningType || ""}" ${r.date ? "· " + r.date : ""}`
      : `🛠️ ${r.name} — ${r.issue || ""}`;

    card.innerHTML = `
      <div class="kc-top">
        <span class="chip ${r.type}">${r.type}</span>
        <span class="badge">${prettyStatus(r.status)}</span>
      </div>
      <div class="kc-label">${escapeHtml(label)}</div>
      <div class="kc-actions">
        <button class="btn-mini js-edit" type="button">Edit</button>
        <button class="btn-mini js-quick-done" type="button">Mark Done</button>
      </div>
    `;

    card.querySelector(".js-quick-done")?.addEventListener("click", () => {
      if (r.status !== "done") updateStatus(r.id, "done", { optimistic: true });
    });

    card.querySelector(".js-edit")?.addEventListener("click", () => {
      const next = prompt("Update status: open | in_progress | done", r.status);
      if (!next) return;
      if (!["open", "in_progress", "done"].includes(next)) return toast("Invalid status");
      updateStatus(r.id, next, { optimistic: true });
    });

    return card;
  }

  function enableDnD() {
    let dragItem = null;

    $$(".kanban-card", kanban).forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        dragItem = card;
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragend", () => {
        dragItem = null;
        card.classList.remove("dragging");
      });
    });

    $$(".kanban-list", kanban).forEach((list) => {
      list.addEventListener("dragover", (e) => {
        e.preventDefault();
        const after = getDragAfterElement(list, e.clientY);
        const dragging = $(".dragging", kanban);
        if (!dragging) return;
        if (!after) list.appendChild(dragging);
        else list.insertBefore(dragging, after);
      });

      list.addEventListener("drop", async (e) => {
        e.preventDefault();
        if (!dragItem) return;
        const newStatus = list.dataset.status;
        const id = dragItem.dataset.id;
        const oldStatus = dragItem.dataset.status;
        if (newStatus && id && newStatus !== oldStatus) {
          await updateStatus(id, newStatus, { optimistic: true });
        } else {
          // Keep badge consistent after reorder
          const badge = dragItem.querySelector(".badge");
          if (badge) badge.textContent = prettyStatus(oldStatus);
        }
      });
    });
  }

  function getDragAfterElement(container, y) {
    const els = [...container.querySelectorAll(".kanban-card:not(.dragging)")];
    return els.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - (box.top + box.height / 2);
        return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  }

  // ---------- Status updates (optimistic) ----------
  async function updateStatus(id, status, { optimistic = false } = {}) {
    if (optimistic) {
      const item = allRequests.find((r) => r.id === id);
      if (item) item.status = status;

      // Move card
      const card = kanban?.querySelector(`.kanban-card[data-id="${CSS_ESCAPE(id)}"]`);
      if (card) {
        card.dataset.status = status;
        const badge = card.querySelector(".badge");
        if (badge) badge.textContent = prettyStatus(status);
        const dest = kanban?.querySelector(`.kanban-list[data-status="${CSS_ESCAPE(status)}"]`);
        if (dest && card.parentElement !== dest) dest.appendChild(card);
      }
      recomputeMetrics(applyFilters(allRequests, currentFilter));
      syncListBadge(id, status);
    }

    // If APP.store exists and no API, persist locally (best-effort)
    if (HAS_APP_STORE && !API_BASE) {
      // We don't have stable IDs in legacy lists; skip deep persistence.
    }

    // Try API persistence
    if (API_BASE) {
      try {
        const res = await authedFetch(`/requests/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify({ status })
        });
        if (!res || !res.ok) {
          toast("⚠️ Failed to save — reverting");
          await fetchRequests(true); renderAll(); return;
        }
      } catch {
        toast("⚠️ Network error — reverting");
        await fetchRequests(true); renderAll(); return;
      }
    }
  }

  function syncListBadge(id, status) {
    const badge = document.querySelector(
      `#allCleaningRequests li[data-id="${CSS_ESCAPE(id)}"] .badge, #allRepairRequests li[data-id="${CSS_ESCAPE(id)}"] .badge`
    );
    if (badge) badge.textContent = `Status: ${prettyStatus(status)}`;
  }

  // ---------- Filtering / Metrics / Export ----------
  function applyFilters(items, { q, type, status }) {
    const Q = (q || "").trim().toLowerCase();
    return items.filter((r) => {
      if (type && type !== "all" && r.type !== type) return false;
      if (status && status !== "all" && r.status !== status) return false;
      if (Q) {
        const blob = `${r.name} ${r.issue || ""} ${r.cleaningType || ""}`.toLowerCase();
        if (!blob.includes(Q)) return false;
      }
      return true;
    });
  }

  function recomputeMetrics(items) {
    const counts = { open: 0, in_progress: 0, done: 0 };
    items.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    if (metricOpen)        metricOpen.textContent = String(counts.open || 0);
    if (metricInProgress)  metricInProgress.textContent = String(counts.in_progress || 0);
    if (metricDone)        metricDone.textContent = String(counts.done || 0);

    // Column pills
    ["open", "in_progress", "done"].forEach((k) => {
      const el = $("#count-" + k);
      if (el) el.textContent = String(items.filter((r) => r.status === k).length);
    });
  }

  function exportCSV() {
    const rows = [["Type", "Name", "Details", "Date/Info", "Status"]];
    const filtered = applyFilters(allRequests, currentFilter);

    filtered.forEach((r) => {
      if (r.type === "cleaning") {
        rows.push(["cleaning", r.name, r.cleaningType || "", r.date || "", r.status]);
      } else {
        rows.push(["repair", r.name, r.issue || "", "", r.status]);
      }
    });

    const csv = rows.map((r) =>
      r.map((v) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")
    ).join("\n");

    // Prefer APP.store downloader
    if (HAS_APP_STORE && APP.store.download) {
      APP.store.download(`baylis-requests-${Date.now()}.csv`, csv, "text/csv");
      return;
    }
    // Fallback
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `baylis-requests-${Date.now()}.csv` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 300);
  }

  // ---------- Utilities ----------
  function normalizeReq(r) {
    const type = (r.type === "repair") ? "repair" : "cleaning";
    const status = normStatus(r.status);
    return {
      id: r._id || r.id || `${type}_${Math.random().toString(36).slice(2)}`,
      type,
      name: r.name || r.cleaningName || r.repairName || "Unknown",
      cleaningType: r.cleaningType || r.typeDetail || "",
      date: r.date || r.cleaningDate || "",
      issue: r.issue || r.repairIssue || "",
      status
    };
  }

  function normStatus(s) {
    const v = String(s || "open").toLowerCase().replace(/\s+/g, "_").replace(/-+/g, "_");
    if (v === "in_progress") return "in_progress";
    if (v === "open" || v === "done") return v;
    return "open";
  }

  function groupBy(arr, keyFn) {
    return arr.reduce((acc, x) => {
      const k = keyFn(x);
      (acc[k] || (acc[k] = [])).push(x);
      return acc;
    }, {});
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function isLoadingList(ul) {
    if (!ul) return false;
    if (ul.children.length !== 1) return false;
    const only = ul.children[0];
    return /loading/i.test(only?.textContent || "");
  }

  function harvestFromLists() {
    const out = [];
    const parseLi = (li, type) => {
      const text = li.textContent.trim();
      const id = li.dataset.id || Math.random().toString(36).slice(2);
      const rawStatus = li.dataset.status || (/status:\s*(open|in progress|in_progress|done)/i.exec(text)?.[1] || "open");
      const status = normStatus(rawStatus);

      if (type === "cleaning") {
        const name = /🧼\s*(.+?)\s*—/.exec(text)?.[1] || "Unknown";
        const ctype = /"(.+?)"/.exec(text)?.[1] || "";
        const date = /on\s+([0-9\-]+)/i.exec(text)?.[1] || "";
        out.push({ id, type, name, cleaningType: ctype, date, issue: "", status });
      } else {
        const name = /🛠️\s*(.+?)\s*—/.exec(text)?.[1] || "Unknown";
        const issue = /—\s*(.+?)(?:Status:|$)/.exec(text)?.[1]?.trim() || "";
        out.push({ id, type, name, cleaningType: "", date: "", issue, status });
      }
    };
    [...(ulClean?.children || [])].forEach((li) => parseLi(li, "cleaning"));
    [...(ulRepair?.children || [])].forEach((li) => parseLi(li, "repair"));
    return out;
  }

  async function authedFetch(path, options = {}) {
    try {
      const token = localStorage.getItem("token");
      const headers = Object.assign(
        { "Content-Type": "application/json" },
        options.headers || {},
        token ? { Authorization: `Bearer ${token}` } : {}
      );
      const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      if (res.status === 401) {
        toast("Session expired. Please log in again.");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setTimeout(() => (window.location.href = "login.html"), 700);
        return null;
      }
      return res;
    } catch { return null; }
  }

  function ensureKanbanSection() {
    let section = $("#kanbanBoard")?.closest("section");
    if (!section) {
      section = document.createElement("section");
      section.className = "dashboard-card";
      section.innerHTML = `
        <h3 style="margin-bottom:.6rem;">Kanban Board</h3>
        <div id="kanbanBoard" class="kanban" aria-label="Requests Kanban"></div>
      `;
      const container = $("main.container");
      const panels = container?.querySelectorAll(".dashboard-cards")[1] || null;
      if (panels?.nextElementSibling) container.insertBefore(section, panels.nextElementSibling);
      else container?.appendChild(section);
    }
    kanban = $("#kanbanBoard");
  }

  function ensureKanbanStyles() {
    if ($("#kanban-style")) return;
    const css = `
      .kanban { display:grid; grid-template-columns: repeat(3,1fr); gap:.8rem; }
      .kanban-col { background: var(--bg-light, #fff); border-radius: var(--radius, 12px); box-shadow: var(--shadow, 0 1px 3px rgba(0,0,0,.08)); padding:.6rem; }
      body.dark .kanban-col { background:#2c2c3f; }
      .kanban-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:.4rem; }
      .kanban-header .pill { background:#eaf2fa; padding:.1rem .5rem; border-radius:999px; font-size:.85rem; }
      body.dark .kanban-header .pill { background:#3b4c64; color:#fff; }
      .kanban-list { min-height: 180px; display:flex; flex-direction:column; gap:.5rem; }
      .kanban-card { background: var(--bg-light, #fff); border:1px solid #e5e7eb; border-radius: var(--radius, 12px); padding:.5rem .6rem; box-shadow: var(--shadow, 0 1px 3px rgba(0,0,0,.08)); cursor:grab; }
      body.dark .kanban-card { background:#2c2c3f; border-color:#444; }
      .kanban-card.dragging { opacity:.75; box-shadow: var(--shadow-hover, 0 8px 24px rgba(0,0,0,.2)); }
      .kc-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:.3rem; }
      .chip { font-size:.75rem; padding:.05rem .45rem; border-radius:999px; text-transform:capitalize; background:#eef2f7; }
      .chip.cleaning { background:#e6f4ff; }
      .chip.repair { background:#fff2e6; }
      body.dark .chip { background:#3a3a4f; color:#fff; }
      .kc-label { font-size:.95rem; }
      .kc-actions { display:flex; gap:.4rem; justify-content:flex-end; margin-top:.35rem; }
      .btn-mini { font-size:.75rem; border:1px solid #e5e7eb; border-radius:8px; background:transparent; padding:.2rem .5rem; cursor:pointer; }
      body.dark .btn-mini { border-color:#555; color:#fff; }
      @media (max-width: 900px) { .kanban { grid-template-columns: 1fr; } }
    `;
    const style = document.createElement("style");
    style.id = "kanban-style";
    style.textContent = css;
    document.head.appendChild(style);
  }
})();
