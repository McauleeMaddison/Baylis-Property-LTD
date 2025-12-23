(() => {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body || !body.classList.contains("page--community")) return;

  const API_BASE = body.getAttribute("data-api-base") || window.API_BASE || "/api";
  const PAGE_SIZE = 6;
  const els = {
    form: document.getElementById("communityForm"),
    title: document.getElementById("postTitle"),
    message: document.getElementById("postMessage"),
    feed: document.getElementById("communityFeed"),
    search: document.getElementById("postSearch"),
    sort: document.getElementById("postSort"),
    mine: document.getElementById("filterMine"),
    pinnedOnly: document.getElementById("filterPinnedOnly"),
    prev: document.getElementById("pagePrev"),
    next: document.getElementById("pageNext"),
    info: document.getElementById("pageInfo"),
    exportBtn: document.getElementById("exportCommunityBtn"),
    importInput: document.getElementById("importCommunityInput"),
  };

  const state = {
    user: null,
    posts: [],
    filtered: [],
    page: 1,
    accent: localStorage.getItem("accent") || "blue",
  };

  const accentMap = {
    blue: "#72a4ff",
    teal: "#2dd4bf",
    violet: "#a78bfa",
  };

  function applyAccent(name) {
    const color = accentMap[name] || accentMap.blue;
    document.documentElement.style.setProperty("--brand", color);
    state.accent = name;
    localStorage.setItem("accent", name);
  }

  function getCsrfToken() {
    const match = document.cookie.match(/(?:^|;)\s*csrfToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  async function ensureCsrfToken() {
    if (getCsrfToken()) return;
    await fetchJSON("/security/csrf");
  }

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
      throw new Error(text || `Request failed (${res.status})`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async function ensureUser() {
    const data = await fetchJSON("/auth/me");
    if (!data?.user) throw new Error("unauthorized");
    state.user = data.user;
  }

  async function loadPosts() {
    const posts = await fetchJSON("/community");
    state.posts = Array.isArray(posts) ? posts : [];
    filterPosts();
    render();
  }

  function filterPosts() {
    let posts = [...state.posts];
    const q = (els.search?.value || "").trim().toLowerCase();
    const mine = !!els.mine?.checked;
    const onlyPinned = !!els.pinnedOnly?.checked;
    if (q) {
      posts = posts.filter((post) => {
        const blob = `${post.title || ""} ${post.message || ""} ${post.author || ""}`.toLowerCase();
        return blob.includes(q);
      });
    }
    if (mine) {
      const me = (state.user?.profile?.displayName || state.user?.username || "").toLowerCase();
      posts = posts.filter((post) => (post.author || "").toLowerCase() === me);
    }
    if (onlyPinned) {
      posts = posts.filter((post) => post.pinned);
    }
    const sort = els.sort?.value || "newest";
    posts.sort((a, b) => {
      if (sort === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === "most_liked") return (b.likes || 0) - (a.likes || 0);
      if (sort === "pinned_first") {
        if (a.pinned === b.pinned) return new Date(b.createdAt) - new Date(a.createdAt);
        return b.pinned ? 1 : -1;
      }
      return 0;
    });
    state.filtered = posts;
    state.page = 1;
  }

  function currentPageItems() {
    const start = (state.page - 1) * PAGE_SIZE;
    return state.filtered.slice(start, start + PAGE_SIZE);
  }

  function render() {
    if (!els.feed) return;
    els.feed.innerHTML = "";
    const items = currentPageItems();
    if (!items.length) {
      els.feed.innerHTML = '<li class="muted">No posts match your filters.</li>';
    } else {
      items.forEach((post) => {
        els.feed.appendChild(renderPost(post));
      });
    }
    const max = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
    if (els.info) els.info.textContent = `Page ${state.page} / ${max} · ${state.filtered.length} posts`;
    if (els.prev) els.prev.disabled = state.page <= 1;
    if (els.next) els.next.disabled = state.page >= max;
  }

  function renderPost(post) {
    const li = document.createElement("li");
    li.className = "post";
    li.dataset.id = post.id;
    const created = new Date(post.createdAt || Date.now()).toLocaleString();
    const comments = Array.isArray(post.comments) ? post.comments : [];
    li.innerHTML = `
      <div class="post__meta">
        <span class="badge">${post.pinned ? "Pinned" : "Post"}</span>
        <span>${escapeHtml(post.author || "Anon")}</span>
        <span class="muted">• ${created}</span>
      </div>
      <h3 class="post__title">${escapeHtml(post.title || "Untitled")}</h3>
      <div class="post__body">${escapeHtml(post.message || "")}</div>
      <div class="post__foot">
        <div class="post__mod">
          <button class="btn-chip" data-action="comment">Comment</button>
        </div>
        <span class="muted">${comments.length} comments</span>
      </div>
      <div class="post__comments">
        <ul class="comment-list">
          ${comments.map((c) => `<li class="comment"><strong>${escapeHtml(c.author || "Anon")}</strong>: ${escapeHtml(c.message || "")}</li>`).join("")}
        </ul>
        <form data-form="comment" style="display:flex;gap:.5rem;margin-top:.5rem;">
          <input type="text" name="message" placeholder="Write a comment…" required style="flex:1;" />
          <button type="submit" class="btn secondary">Add</button>
        </form>
      </div>
    `;
    li.querySelector('[data-action="comment"]')?.addEventListener("click", () => {
      li.querySelector('input[name="message"]')?.focus();
    });
    li.querySelector('[data-form="comment"]')?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = event.target.message.value.trim();
      if (!message) return;
      await postComment(post.id, message);
      event.target.reset();
    });
    return li;
  }

  async function createPost({ title, message }) {
    if (!message.trim()) throw new Error("Message required");
    await ensureCsrfToken();
    await fetchJSON("/community", {
      method: "POST",
      headers: { "X-CSRF-Token": getCsrfToken() },
      body: { title: title.trim(), message: message.trim() },
    });
    await loadPosts();
    window.showToast?.("✅ Post published");
  }

  async function postComment(postId, message) {
    await ensureCsrfToken();
    await fetchJSON(`/community/${encodeURIComponent(postId)}/comments`, {
      method: "POST",
      headers: { "X-CSRF-Token": getCsrfToken() },
      body: { message },
    });
    await loadPosts();
    window.showToast?.("💬 Comment added");
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  }

  function exportPosts() {
    const blob = new Blob([JSON.stringify(state.posts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `baylis-community-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function warnImportDisabled() {
    window.showToast?.("⚠️ Import is disabled because posts are stored on the server.");
  }

  function bindEvents() {
    if (els.form) {
      els.form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const title = els.title?.value || "";
        const message = els.message?.value || "";
        try {
          await createPost({ title, message });
          els.form.reset();
        } catch (err) {
          window.showToast?.(`❌ ${err.message || "Unable to post"}`);
        }
      });
    }
    els.search?.addEventListener("input", () => {
      filterPosts();
      render();
    });
    els.sort?.addEventListener("change", () => {
      filterPosts();
      render();
    });
    els.mine?.addEventListener("change", () => {
      filterPosts();
      render();
    });
    els.pinnedOnly?.addEventListener("change", () => {
      filterPosts();
      render();
    });
    els.prev?.addEventListener("click", () => {
      if (state.page > 1) {
        state.page -= 1;
        render();
      }
    });
    els.next?.addEventListener("click", () => {
      const max = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
      if (state.page < max) {
        state.page += 1;
        render();
      }
    });
    els.exportBtn?.addEventListener("click", exportPosts);
    els.importInput?.addEventListener("change", (event) => {
      event.target.value = "";
      warnImportDisabled();
    });
    document.querySelectorAll("[data-accent-option]")?.forEach((btn) => {
      btn.addEventListener("click", () => applyAccent(btn.dataset.accentOption || "blue"));
    });
  }

  async function boot() {
    try {
      applyAccent(state.accent);
      await ensureUser();
      await ensureCsrfToken();
      bindEvents();
      await loadPosts();
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
