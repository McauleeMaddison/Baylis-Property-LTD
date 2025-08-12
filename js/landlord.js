// js/landlord.js
window.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE || 'http://localhost:4000/api';

  // ----- DOM targets already on landlord.html -----
  const ulClean  = document.getElementById('allCleaningRequests');
  const ulRepair = document.getElementById('allRepairRequests');
  const ulPosts  = document.getElementById('allCommunityPosts');

  const metricOpen = document.getElementById('metricOpen');
  const metricInProgress = document.getElementById('metricInProgress');
  const metricDone = document.getElementById('metricDone');
  const metricPosts = document.getElementById('metricPosts');

  const search = document.getElementById('reqSearch');
  const filterType = document.getElementById('filterType');
  const filterStatus = document.getElementById('filterStatus');
  const btnRefresh = document.getElementById('btnRefresh');

  // ----- Inject a Kanban section if not present -----
  let kanbanSection = document.getElementById('kanbanBoard');
  if (!kanbanSection) {
    kanbanSection = document.createElement('section');
    kanbanSection.className = 'dashboard-card';
    kanbanSection.innerHTML = `
      <h3 style="margin-bottom:.6rem;">Kanban Board</h3>
      <div id="kanbanBoard" class="kanban"></div>
    `;
    // insert after requests panels
    const container = document.querySelector('main.container');
    const requestsPanels = container?.querySelectorAll('.dashboard-cards')[1] || null;
    if (requestsPanels?.nextElementSibling) {
      container.insertBefore(kanbanSection, requestsPanels.nextElementSibling);
    } else {
      container?.appendChild(kanbanSection);
    }
  }
  const kanban = document.getElementById('kanbanBoard');

  // ----- Minimal Kanban CSS (injected) -----
  ensureKanbanStyles();

  // ----- Local state -----
  const STATUS = {
    open: 'Open',
    in_progress: 'In Progress',
    done: 'Done'
  };
  let allRequests = [];  // canonical array from API
  let currentFilter = { q: '', type: 'all', status: 'all' };

  // ===== Boot =====
  bootstrap();

  // ===== EVENTS =====
  search?.addEventListener('input', () => {
    currentFilter.q = (search.value || '').toLowerCase();
    renderAll();
  });
  filterType?.addEventListener('change', () => {
    currentFilter.type = filterType.value || 'all';
    renderAll();
  });
  filterStatus?.addEventListener('change', () => {
    currentFilter.status = filterStatus.value || 'all';
    renderAll();
  });
  btnRefresh?.addEventListener('click', async () => {
    await fetchRequests(true);
    renderAll();
    toast('🔄 Refreshed');
  });

  // ===== MAIN =====
  async function bootstrap() {
    // Try to fetch; if script.js already filled lists, we still fetch fresh data for Kanban accuracy
    await fetchRequests(false);
    renderAll();

    // posts metric (7d best-effort if timestamps exist; else count)
    if (metricPosts) {
      try {
        const res = await authedFetch('/posts', { method: 'GET' });
        if (res?.ok) {
          const posts = await res.json();
          metricPosts.textContent = posts.length;
        } else {
          metricPosts.textContent = (ulPosts?.children?.length || 0);
        }
      } catch {
        metricPosts.textContent = (ulPosts?.children?.length || 0);
      }
    }
  }

  async function fetchRequests(force) {
    try {
      const res = await authedFetch('/requests', { method: 'GET' });
      if (res?.ok) {
        allRequests = (await res.json()).map(normalizeReq);
        // Also (optionally) populate ULs if they still show "Loading…" or if force is true
        if (force || isLoadingList(ulClean) || isLoadingList(ulRepair)) {
          populateListsFromState();
        }
      } else {
        // if API fails, keep current DOM-based view
        if (!allRequests.length) {
          allRequests = harvestFromLists();
        }
      }
    } catch {
      if (!allRequests.length) {
        allRequests = harvestFromLists();
      }
    }
  }

  function renderAll() {
    const filtered = applyFilters(allRequests, currentFilter);
    renderKanban(filtered);
    recomputeMetrics(filtered);
  }

  // ===== RENDER: Lists (optional) =====
  function populateListsFromState() {
    if (ulClean) ulClean.innerHTML = '';
    if (ulRepair) ulRepair.innerHTML = '';

    allRequests.forEach(r => {
      const li = document.createElement('li');
      li.className = 'animated';
      li.dataset.id = r.id;
      li.dataset.type = r.type;
      li.dataset.status = r.status;

      if (r.type === 'cleaning') {
        li.innerHTML = `
          🧼 <strong>${escapeHtml(r.name)}</strong> — "<em>${escapeHtml(r.cleaningType || '')}</em>" on ${escapeHtml(r.date || '—')}
          <span class="badge">Status: ${prettyStatus(r.status)}</span>
        `;
        ulClean?.appendChild(li);
      } else {
        li.innerHTML = `
          🛠️ <strong>${escapeHtml(r.name)}</strong> — ${escapeHtml(r.issue || 'Issue')}
          <span class="badge">Status: ${prettyStatus(r.status)}</span>
        `;
        ulRepair?.appendChild(li);
      }
    });
  }

  function isLoadingList(ul) {
    if (!ul) return false;
    const onlyChild = ul.children.length === 1 ? ul.children[0] : null;
    return !!onlyChild && /loading/i.test(onlyChild.textContent || '');
  }

  // ===== RENDER: Kanban =====
  function renderKanban(requests) {
    if (!kanban) return;
    kanban.innerHTML = '';
    const columns = [
      { key: 'open', title: STATUS.open },
      { key: 'in_progress', title: STATUS.in_progress },
      { key: 'done', title: STATUS.done }
    ];

    columns.forEach(col => {
      const wrap = document.createElement('div');
      wrap.className = 'kanban-col';
      wrap.dataset.status = col.key;
      wrap.innerHTML = `
        <div class="kanban-header">
          <h4>${col.title}</h4>
          <span class="pill" id="count-${col.key}">0</span>
        </div>
        <div class="kanban-list" data-status="${col.key}" aria-label="${col.title}"></div>
      `;
      kanban.appendChild(wrap);
    });

    const byStatus = groupBy(requests, r => r.status || 'open');
    Object.keys(byStatus).forEach(status => {
      const list = kanban.querySelector(`.kanban-list[data-status="${cssEsc(status)}"]`);
      const countEl = kanban.querySelector(`#count-${cssEsc(status)}`);
      if (!list) return;
      byStatus[status].forEach(r => list.appendChild(makeCard(r)));
      if (countEl) countEl.textContent = String(byStatus[status].length);
    });

    enableDnD();
  }

  function makeCard(r) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.id = r.id;
    card.dataset.type = r.type;
    card.dataset.status = r.status;

    const label = r.type === 'cleaning'
      ? `🧼 ${r.name} — "${r.cleaningType || ''}" ${r.date ? '· ' + r.date : ''}`
      : `🛠️ ${r.name} — ${r.issue || ''}`;

    card.innerHTML = `
      <div class="kc-top">
        <span class="chip ${r.type}">${r.type}</span>
        <span class="badge">${prettyStatus(r.status)}</span>
      </div>
      <div class="kc-label">${escapeHtml(label)}</div>
      <div class="kc-actions">
        <button class="btn-mini js-edit">Edit</button>
        <button class="btn-mini js-quick-done">Mark Done</button>
      </div>
    `;

    card.querySelector('.js-quick-done')?.addEventListener('click', () => {
      if (r.status === 'done') return;
      updateStatus(r.id, 'done', { optimistic: true });
    });

    card.querySelector('.js-edit')?.addEventListener('click', () => {
      // Simple inline edit prompt (placeholder for full modal)
      const next = prompt('Update status: open | in_progress | done', r.status);
      if (!next) return;
      if (!['open','in_progress','done'].includes(next)) {
        return toast('Invalid status.');
      }
      updateStatus(r.id, next, { optimistic: true });
    });

    return card;
  }

  function enableDnD() {
    let dragItem = null;

    kanban.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        dragItem = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        dragItem = null;
        card.classList.remove('dragging');
      });
    });

    kanban.querySelectorAll('.kanban-list').forEach(list => {
      list.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(list, e.clientY);
        const draggable = kanban.querySelector('.dragging');
        if (!draggable) return;
        if (afterElement == null) list.appendChild(draggable);
        else list.insertBefore(draggable, afterElement);
      });

      list.addEventListener('drop', async (e) => {
        e.preventDefault();
        if (!dragItem) return;
        const newStatus = list.dataset.status;
        const id = dragItem.dataset.id;
        const oldStatus = dragItem.dataset.status;
        if (newStatus && id && newStatus !== oldStatus) {
          await updateStatus(id, newStatus, { optimistic: true });
        } else {
          // snap badge text even when no status change (reorder only)
          const badge = dragItem.querySelector('.badge');
          if (badge) badge.textContent = prettyStatus(oldStatus);
        }
      });
    });
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - (box.top + box.height / 2);
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // ===== UPDATE STATUS =====
  async function updateStatus(id, status, { optimistic = false } = {}) {
    // Optimistic update in state + UI first
    if (optimistic) {
      const item = allRequests.find(r => r.id === id);
      if (item) item.status = status;
      const card = kanban.querySelector(`.kanban-card[data-id="${cssEsc(id)}"]`);
      if (card) {
        card.dataset.status = status;
        const badge = card.querySelector('.badge');
        if (badge) badge.textContent = prettyStatus(status);
        // move card to the new column
        const list = kanban.querySelector(`.kanban-list[data-status="${cssEsc(status)}"]`);
        if (list && card.parentElement !== list) list.appendChild(card);
      }
      recomputeMetrics(applyFilters(allRequests, currentFilter));
    }

    // Persist to backend
    try {
      const res = await authedFetch(`/requests/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (!res?.ok) {
        toast('⚠️ Failed to save—reverting.');
        // Revert optimistic change
        await fetchRequests(true);
        renderAll();
      } else {
        toast('✅ Status updated');
        // Optionally refresh UL badges if our lists were populated by us
        syncListBadge(id, status);
      }
    } catch {
      toast('⚠️ Network error—reverting.');
      await fetchRequests(true);
      renderAll();
    }
  }

  function syncListBadge(id, status) {
    const badgeInLists = document.querySelector(
      `#allCleaningRequests li[data-id="${cssEsc(id)}"] .badge, #allRepairRequests li[data-id="${cssEsc(id)}"] .badge`
    );
    if (badgeInLists) badgeInLists.textContent = `Status: ${prettyStatus(status)}`;
  }

  // ===== FILTERS & METRICS =====
  function applyFilters(items, { q, type, status }) {
    return items.filter(r => {
      if (type && type !== 'all' && r.type !== type) return false;
      if (status && status !== 'all' && r.status !== status) return false;
      if (q) {
        const text = `${r.name} ${r.issue || ''} ${r.cleaningType || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }

  function recomputeMetrics(items) {
    const counts = { open: 0, in_progress: 0, done: 0 };
    items.forEach(r => counts[r.status] = (counts[r.status] || 0) + 1);
    if (metricOpen) metricOpen.textContent = String(counts.open || 0);
    if (metricInProgress) metricInProgress.textContent = String(counts.in_progress || 0);
    if (metricDone) metricDone.textContent = String(counts.done || 0);

    // Update Kanban column pills
    ['open','in_progress','done'].forEach(k => {
      const el = document.getElementById(`count-${k}`);
      if (el) el.textContent = String(items.filter(r => r.status === k).length);
    });
  }

  // ===== UTIL =====
  function normalizeReq(r) {
    return {
      id: r._id || r.id || String(Math.random()).slice(2),
      type: r.type === 'repair' ? 'repair' : 'cleaning',
      name: r.name || r.cleaningName || r.repairName || 'Unknown',
      cleaningType: r.cleaningType || r.typeDetail || '',
      date: r.date || r.cleaningDate || '',
      issue: r.issue || r.repairIssue || '',
      status: normStatus(r.status)
    };
  }

  function normStatus(s) {
    const v = String(s || 'open').toLowerCase();
    if (v === 'in progress' || v === 'in-progress') return 'in_progress';
    if (['open','in_progress','done'].includes(v)) return v;
    return 'open';
  }

  function groupBy(arr, fn) {
    return arr.reduce((acc, x) => {
      const k = fn(x);
      (acc[k] ||= []).push(x);
      return acc;
    }, {});
  }

  function prettyStatus(s) {
    return s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function cssEsc(s) { return String(s).replace(/"/g, '\\"'); }

  function harvestFromLists() {
    // Fallback: parse existing ULs (best-effort)
    const out = [];
    const parseLi = (li, type) => {
      const text = li.textContent.trim();
      const id = li.dataset.id || String(Math.random()).slice(2);
      const status = (li.dataset.status || '').toLowerCase() ||
        (/status:\s*(open|in progress|done)/i.exec(text)?.[1] || 'open')
          .toLowerCase().replace(' ', '_');

      if (type === 'cleaning') {
        const name = /🧼\s*(.+?)\s*—/.exec(text)?.[1] || 'Unknown';
        const ctype = /"(.+?)"/.exec(text)?.[1] || '';
        const date = /on\s+([0-9\-]+)/i.exec(text)?.[1] || '';
        out.push({ id, type, name, cleaningType: ctype, date, issue:'', status: normStatus(status) });
      } else {
        const name = /🛠️\s*(.+?)\s*—/.exec(text)?.[1] || 'Unknown';
        const issue = /—\s*(.+?)(?:Status:|$)/.exec(text)?.[1]?.trim() || '';
        out.push({ id, type, name, cleaningType:'', date:'', issue, status: normStatus(status) });
      }
    };
    [...(ulClean?.children || [])].forEach(li => parseLi(li, 'cleaning'));
    [...(ulRepair?.children || [])].forEach(li => parseLi(li, 'repair'));
    return out;
  }

  async function authedFetch(path, options = {}) {
    const token = localStorage.getItem('token');
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      options.headers || {},
      token ? { 'Authorization': `Bearer ${token}` } : {}
    );
    try {
      const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      if (res.status === 401) {
        toast('Session expired. Please log in again.');
        localStorage.removeItem('token'); localStorage.removeItem('role');
        setTimeout(()=> window.location.href='login.html', 800);
        return null;
      }
      return res;
    } catch {
      return null;
    }
  }

  function toast(t) {
    if (typeof window.showToast === 'function') return window.showToast(t);
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = t;
    document.body.appendChild(el);
    setTimeout(()=> el.classList.add('show'), 80);
    setTimeout(()=> el.remove(), 3200);
  }

  function ensureKanbanStyles() {
    if (document.getElementById('kanban-style')) return;
    const css = `
      .kanban { display:grid; grid-template-columns: repeat(3,1fr); gap: .8rem; }
      .kanban-col { background: var(--bg-light); border-radius: var(--radius); box-shadow: var(--shadow); padding:.6rem; }
      body.dark .kanban-col { background:#2c2c3f; }
      .kanban-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:.4rem; }
      .kanban-header .pill { background: #eaf2fa; padding:.1rem .5rem; border-radius:999px; font-size:.85rem; }
      body.dark .kanban-header .pill { background:#3b4c64; color:#fff; }
      .kanban-list { min-height: 180px; display:flex; flex-direction:column; gap:.5rem; }
      .kanban-card { background: var(--bg-light); border:1px solid #e5e7eb; border-radius: var(--radius); padding:.5rem .6rem; box-shadow: var(--shadow); cursor:grab; }
      body.dark .kanban-card { background:#2c2c3f; border-color:#444; }
      .kanban-card.dragging { opacity:.7; box-shadow: var(--shadow-hover); }
      .kc-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:.3rem; }
      .chip { font-size:.75rem; padding:.05rem .45rem; border-radius:999px; text-transform:capitalize; background:#eef2f7; }
      .chip.cleaning { background:#e6f4ff; }
      .chip.repair   { background:#fff2e6; }
      body.dark .chip { background:#3a3a4f; color:#fff; }
      .kc-label { font-size:.95rem; }
      .kc-actions { display:flex; gap:.4rem; justify-content:flex-end; margin-top:.35rem; }
      .btn-mini { font-size:.75rem; border:1px solid #e5e7eb; border-radius:8px; background:transparent; padding:.2rem .5rem; cursor:pointer; }
      body.dark .btn-mini { border-color:#555; color:#fff; }
      @media (max-width: 900px) { .kanban { grid-template-columns: 1fr; } }
    `;
    const style = document.createElement('style');
    style.id = 'kanban-style';
    style.textContent = css;
    document.head.appendChild(style);
  }
});
