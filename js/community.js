(() => {
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const nowISO = () => new Date().toISOString();
  const LS_KEY = "community_posts_v1";
  const PAGE_SIZE = 6;
  const API_BASE = document.body?.getAttribute("data-api-base") || window.API_BASE || "/api";
  const getCsrfToken = () => {
    const match = document.cookie.match(/(?:^|;)\s*csrfToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  };

  const state = {
    posts: [],
    filtered: [],
    page: 1,
    me: (localStorage.getItem("displayName") || "Mac").trim() || "User",
    accent: localStorage.getItem("accent") || "blue",
  };

  const el = {
    form: q("#communityForm"),
    title: q("#postTitle"),
    msg: q("#postMessage"),
    feed: q("#communityFeed"),
    search: q("#postSearch"),
    sort: q("#postSort"),
    mine: q("#filterMine"),
    pinnedOnly: q("#filterPinnedOnly"),
    prev: q("#pagePrev"),
    next: q("#pageNext"),
    info: q("#pageInfo"),
    exportBtn: q("#exportCommunityBtn"),
    importInput: q("#importCommunityInput"),
  };

  const accentMap = {
    blue: "#72a4ff",
    teal: "#2dd4bf",
    violet: "#a78bfa",
  };

  function applyAccent(name) {
    const val = accentMap[name] || accentMap.blue;
    document.documentElement.style.setProperty("--brand", val);
    localStorage.setItem("accent", name);
    state.accent = name;
  }

  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(state.posts));
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data;
    } catch {
      return [];
    }
  }

  async function fetchRemote() {
    if (!API_BASE) return null;
    try {
      const r = await fetch(`${API_BASE}/community`, { credentials: "include" });
      if (!r.ok) return null;
      const data = await r.json();
      if (!Array.isArray(data)) return null;
      return data.map(normalizePost);
    } catch {
      return null;
    }
  }

  function normalizePost(p) {
    return {
      id: p.id || uid(),
      title: p.title?.toString().slice(0, 120) || "",
      message: p.message?.toString() || "",
      author: p.author?.toString() || state.me,
      userId: p.userId || "",
      createdAt: p.createdAt || nowISO(),
      likes: Number.isFinite(p.likes) ? p.likes : 0,
      pinned: !!p.pinned,
      comments: Array.isArray(p.comments) ? p.comments.map(c => ({
        id: c.id || uid(),
        author: c.author?.toString() || "Anon",
        message: c.message?.toString() || "",
        createdAt: c.createdAt || nowISO(),
      })) : [],
    };
  }

  function seedIfEmpty() {
    if (state.posts.length) return;
    state.posts = [
      normalizePost({ title: "Welcome new residents 🎉", message: "Say hello and drop any questions here.", author: "Admin", pinned: true, likes: 5, createdAt: new Date(Date.now() - 86400000).toISOString() }),
      normalizePost({ title: "Cleaner recommendation", message: "Looking for end-of-tenancy clean this Friday.", author: "Alex", likes: 2 }),
    ];
    save();
  }

  function setPage(p) {
    const max = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
    state.page = Math.min(Math.max(1, p), max);
  }

  function getVisible() {
    const start = (state.page - 1) * PAGE_SIZE;
    return state.filtered.slice(start, start + PAGE_SIZE);
  }

  function filterAndSort() {
    const term = (el.search?.value || "").toLowerCase().trim();
    const mine = !!el.mine?.checked;
    const onlyPinned = !!el.pinnedOnly?.checked;
    let arr = [...state.posts];
    if (term) {
      arr = arr.filter(p => [p.title, p.message, p.author].join(" ").toLowerCase().includes(term));
    }
    if (mine) {
      arr = arr.filter(p => (p.author || "").toLowerCase() === state.me.toLowerCase());
    }
    if (onlyPinned) {
      arr = arr.filter(p => p.pinned);
    }
    const sort = el.sort?.value || "newest";
    arr.sort((a, b) => {
      if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
      if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sort === "most_liked") return (b.likes || 0) - (a.likes || 0);
      if (sort === "pinned_first") return (b.pinned === a.pinned) ? b.createdAt.localeCompare(a.createdAt) : (b.pinned ? 1 : -1);
      return 0;
    });
    state.filtered = arr;
    setPage(1);
  }

  function renderFeed() {
    if (!el.feed) return;
    el.feed.innerHTML = "";
    const items = getVisible();
    if (!items.length) {
      const li = document.createElement("li");
      li.className = "muted";
      li.textContent = "No posts match your filters.";
      el.feed.appendChild(li);
    } else {
      items.forEach(p => el.feed.appendChild(renderPost(p)));
    }
    const max = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
    if (el.info) el.info.textContent = `Page ${state.page} / ${max} · ${state.filtered.length} posts`;
    if (el.prev) el.prev.disabled = state.page <= 1;
    if (el.next) el.next.disabled = state.page >= max;
  }

  function renderPost(p) {
    const li = document.createElement("li");
    li.className = "post";
    li.dataset.id = p.id;

    const head = document.createElement("div");
    head.className = "post__head";

    const meta = document.createElement("div");
    meta.className = "post__meta";
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = p.pinned ? "Pinned" : "Post";
    const author = document.createElement("span");
    author.textContent = `• ${p.author}`;
    const date = document.createElement("span");
    date.className = "muted";
    date.textContent = `• ${new Date(p.createdAt).toLocaleString()}`;
    meta.append(badge, author, date);

    const title = document.createElement("h3");
    title.className = "post__title h2";
    title.textContent = p.title || "Untitled";

    const body = document.createElement("div");
    body.className = "post__body";
    body.textContent = p.message;

    const foot = document.createElement("div");
    foot.className = "post__foot";
    const mod = document.createElement("div");
    mod.className = "post__mod";
    const like = document.createElement("button");
    like.className = "btn-chip";
    like.dataset.action = "like";
    like.dataset.id = p.id;
    like.textContent = `👍 ${p.likes || 0}`;
    const pin = document.createElement("button");
    pin.className = "btn-chip";
    pin.dataset.action = "pin";
    pin.dataset.id = p.id;
    pin.textContent = p.pinned ? "Unpin" : "Pin";
    const commentBtn = document.createElement("button");
    commentBtn.className = "btn-chip";
    commentBtn.dataset.action = "comment";
    commentBtn.dataset.id = p.id;
    commentBtn.textContent = "Comment";
    const del = document.createElement("button");
    del.className = "btn-chip";
    del.dataset.action = "delete";
    del.dataset.id = p.id;
    del.textContent = "Delete";
    mod.append(like, pin, commentBtn, del);

    const count = document.createElement("span");
    count.className = "muted";
    count.textContent = `${p.comments?.length || 0} comments`;

    foot.append(mod, count);

    const comments = document.createElement("div");
    comments.className = "post__comments";
    const list = document.createElement("ul");
    list.className = "comment-list";
    (p.comments || []).forEach(c => {
      const ci = document.createElement("li");
      ci.className = "comment";
      ci.textContent = `${c.author}: ${c.message}`;
      list.appendChild(ci);
    });

    const form = document.createElement("form");
    form.dataset.pid = p.id;
    form.style.display = "flex";
    form.style.gap = ".4rem";
    form.style.marginTop = ".5rem";
    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = "Write a comment…";
    inp.required = true;
    inp.style.flex = "1";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn secondary";
    submit.textContent = "Add";
    form.append(inp, submit);

    form.addEventListener("submit", e => {
      e.preventDefault();
      const txt = inp.value.trim();
      if (!txt) return;
      addComment(p.id, { author: state.me, message: txt });
      inp.value = "";
    });

    comments.append(list, form);

    head.append(meta, title);
    li.append(head, body, foot, comments);
    li.addEventListener("click", onPostClick);
    return li;
  }

  function onPostClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === "like") likePost(id);
    if (action === "pin") togglePin(id);
    if (action === "comment") {
      const card = btn.closest(".post");
      const input = card?.querySelector("form input[type='text']");
      input?.focus();
    }
    if (action === "delete") deletePost(id);
  }

  function likePost(id) {
    const p = state.posts.find(x => x.id === id);
    if (!p) return;
    p.likes = (p.likes || 0) + 1;
    save();
    filterAndSort();
    renderFeed();
  }

  function togglePin(id) {
    const p = state.posts.find(x => x.id === id);
    if (!p) return;
    p.pinned = !p.pinned;
    save();
    filterAndSort();
    renderFeed();
  }

  function deletePost(id) {
    const p = state.posts.find(x => x.id === id);
    if (!p) return;
    if (p.author.toLowerCase() !== state.me.toLowerCase() && p.author !== "Admin") return;
    state.posts = state.posts.filter(x => x.id !== id);
    save();
    filterAndSort();
    renderFeed();
  }

  function addComment(pid, c) {
    const p = state.posts.find(x => x.id === pid);
    if (!p) return;
    p.comments = p.comments || [];
    p.comments.unshift({ id: uid(), author: c.author || "User", message: c.message || "", createdAt: nowISO() });
    save();
    filterAndSort();
    renderFeed();
  }

  async function createPost({ title, message }) {
    const post = normalizePost({ id: uid(), title, message, author: state.me, createdAt: nowISO(), likes: 0, pinned: false, comments: [] });
    state.posts.unshift(post);
    save();
    if (window.API_BASE) {
      try {
        const headers = { "Content-Type": "application/json" };
        const csrf = getCsrfToken();
        if (csrf) headers["X-CSRF-Token"] = csrf;
        await fetch(`${window.API_BASE}/community`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify(post),
        });
      } catch {}
    }
    filterAndSort();
    renderFeed();
  }

  function bindEvents() {
    if (el.form) {
      el.form.addEventListener("submit", e => {
        e.preventDefault();
        const title = el.title?.value.trim() || "";
        const message = el.msg?.value.trim() || "";
        if (!message) return;
        createPost({ title, message });
        el.form.reset();
      });
      el.form.addEventListener("keydown", e => {
        const isMac = navigator.platform.toUpperCase().includes("MAC");
        if ((isMac && e.metaKey && e.key === "Enter") || (!isMac && e.ctrlKey && e.key === "Enter")) {
          e.preventDefault();
          el.form.requestSubmit();
        }
      });
    }
    el.search?.addEventListener("input", () => { filterAndSort(); renderFeed(); });
    el.sort?.addEventListener("change", () => { filterAndSort(); renderFeed(); });
    el.mine?.addEventListener("change", () => { filterAndSort(); renderFeed(); });
    el.pinnedOnly?.addEventListener("change", () => { filterAndSort(); renderFeed(); });
    el.prev?.addEventListener("click", () => { setPage(state.page - 1); renderFeed(); });
    el.next?.addEventListener("click", () => { setPage(state.page + 1); renderFeed(); });
    qa("[data-accent-option]").forEach(b => b.addEventListener("click", () => applyAccent(b.dataset.accentOption)));
    el.exportBtn?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state.posts, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "community-posts.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
    el.importInput?.addEventListener("change", async () => {
      const f = el.importInput.files?.[0];
      if (!f) return;
      try {
        const text = await f.text();
        const arr = JSON.parse(text);
        if (Array.isArray(arr)) {
          const map = new Map(state.posts.map(p => [p.id, p]));
          arr.map(normalizePost).forEach(p => map.set(p.id, p));
          state.posts = [...map.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
          save();
          filterAndSort();
          renderFeed();
        }
      } catch {}
      el.importInput.value = "";
    });
  }

  async function init() {
    applyAccent(state.accent);
    const local = loadLocal();
    const remote = await fetchRemote();
    state.posts = (remote && remote.length ? remote : local).map(normalizePost);
    seedIfEmpty();
    bindEvents();
    filterAndSort();
    renderFeed();
  }

  init();
})();
