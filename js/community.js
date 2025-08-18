// js/community.js
(() => {
  "use strict";

  // --------- tiny utils ----------
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = (s) => String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
  const toast = (m) => (typeof window.showToast === "function" ? window.showToast(m) : alert(m));
  const uid = () => "p_" + Math.random().toString(36).slice(2) + Date.now().toString(36);

  // --------- storage (local) ----------
  const KEY = "log:community";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
  const write = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));

  // --------- user identity ----------
  function currentUser() {
    const username = localStorage.getItem("username") || "User";
    const role = (localStorage.getItem("role") || "resident").toLowerCase();
    return { username, role };
  }

  // --------- schema + migration ----------
  // Accept older shapes and upgrade to a richer unified doc
  function migrate(list) {
    if (!Array.isArray(list)) return [];
    let changed = false;
    const out = list.map((p) => {
      if (p && p.id && "likes" in p && "pinned" in p && "comments" in p) return p;
      changed = true;
      return {
        id: p.id || uid(),
        name: p.name || currentUser().username,
        title: p.title || "Post",
        message: p.message || String(p.msg || ""),
        createdAt: Number(p.createdAt || Date.now()),
        editedAt: p.editedAt || null,
        pinned: !!p.pinned,
        likes: Number(p.likes || 0),
        likedBy: Array.isArray(p.likedBy) ? p.likedBy : [],
        comments: Array.isArray(p.comments) ? p.comments : [],
        roleAtPost: p.roleAtPost || currentUser().role
      };
    });
    if (changed) write(out);
    return out;
  }

  // --------- DOM refs ----------
  const elSearch   = $("#postSearch");
  const elSort     = $("#postSort");
  const elMine     = $("#filterMine");
  const elPinned   = $("#filterPinnedOnly");
  const elExport   = $("#exportCommunityBtn");
  const elImport   = $("#importCommunityInput");

  const elForm     = $("#communityForm");
  const elTitle    = $("#postTitle");
  const elMsg      = $("#postMessage");

  const elFeed     = $("#communityFeed");
  const elPrev     = $("#pagePrev");
  const elNext     = $("#pageNext");
  const elInfo     = $("#pageInfo");

  // --------- state ----------
  const PAGE_SIZE = 10;
  let state = {
    q: "",
    sort: "newest",
    mine: false,
    pinnedOnly: false,
    page: 1
  };

  // --------- rendering ----------
  function templatePost(p, me) {
    const when = new Date(p.createdAt).toLocaleString();
    const isMine = (p.name || "").toLowerCase() === (me.username || "").toLowerCase();
    const canMod = isMine || me.role === "landlord";
    const liked = (p.likedBy || []).includes(me.username);

    return `
      <article class="post" data-id="${esc(p.id)}" tabindex="0">
        <header class="post__head">
          <div class="post__meta">
            <strong class="post__author">${esc(p.name)}</strong>
            <span class="muted"> • ${esc(when)}</span>
            ${p.pinned ? `<span class="badge" title="Pinned">📌 Pinned</span>` : ""}
          </div>
          ${p.title ? `<h4 class="post__title">${esc(p.title)}</h4>` : ""}
        </header>

        <div class="post__body">${esc(p.message)}</div>

        <footer class="post__foot">
          <div style="display:flex; gap:.4rem; flex-wrap:wrap;">
            <button class="btn-chip action-like" aria-pressed="${liked}" title="${liked ? "Unlike" : "Like"}">
              ❤️ ${liked ? "Liked" : "Like"} · <span class="like-count">${p.likes || 0}</span>
            </button>
            <button class="btn-chip action-toggle-comments" aria-expanded="false" title="Show/Hide comments">
              💬 Comments (${(p.comments || []).length})
            </button>
          </div>
          ${canMod ? `
            <div class="post__mod">
              <button class="btn-chip action-pin">${p.pinned ? "Unpin" : "Pin"}</button>
              <button class="btn-chip action-delete" data-danger="1">Delete</button>
            </div>` : ""}
        </footer>

        <section class="post__comments hidden" aria-label="Comments">
          <ul class="comment-list">
            ${(p.comments || []).map(c => `
              <li class="comment" data-cid="${esc(c.id)}">
                <strong>${esc(c.user)}</strong>
                <span class="muted"> • ${esc(new Date(c.createdAt).toLocaleString())}</span>
                <div>${esc(c.text)}</div>
              </li>
            `).join("")}
          </ul>
          <form class="comment-form" autocomplete="off">
            <input type="text" name="text" placeholder="Write a comment…" required />
            <button type="submit" class="btn btn-primary">Reply</button>
          </form>
        </section>
      </article>
    `;
  }

  function applyFilters(list, me) {
    let arr = list.slice();
    const q = state.q.toLowerCase().trim();

    if (q) {
      arr = arr.filter(p => (`${p.title} ${p.message} ${p.name}`).toLowerCase().includes(q));
    }
    if (state.mine && me.username) {
      const u = me.username.toLowerCase();
      arr = arr.filter(p => (p.name || "").toLowerCase() === u);
    }
    if (state.pinnedOnly) {
      arr = arr.filter(p => !!p.pinned);
    }

    switch (state.sort) {
      case "oldest":       arr.sort((a,b)=>a.createdAt-b.createdAt); break;
      case "most_liked":   arr.sort((a,b)=>(b.likes||0)-(a.likes||0)); break;
      case "pinned_first": arr.sort((a,b)=> (b.pinned===a.pinned) ? (b.createdAt-a.createdAt) : (b.pinned?1:-1)); break;
      case "newest":
      default:             arr.sort((a,b)=>b.createdAt-a.createdAt); break;
    }
    return arr;
  }

  function paginate(list) {
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    state.page = Math.min(Math.max(1, state.page), pages);
    const start = (state.page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const slice = list.slice(start, end);

    if (elPrev) elPrev.disabled = state.page <= 1;
    if (elNext) elNext.disabled = state.page >= pages;
    if (elInfo) elInfo.textContent = `Page ${state.page} / ${pages} · ${total} post${total === 1 ? "" : "s"}`;

    return slice;
  }

  function render() {
    if (!elFeed) return;

    const me = currentUser();
    const posts = migrate(read());
    const filtered = applyFilters(posts, me);
    const pageSlice = paginate(filtered);

    if (!pageSlice.length) {
      elFeed.innerHTML = `<li class="muted">No posts yet.</li>`;
      return;
    }
    elFeed.innerHTML = pageSlice.map(p => `<li>${templatePost(p, me)}</li>`).join("");
  }

  // --------- actions ----------
  function createPost({ title, message }) {
    const me = currentUser();
    const list = migrate(read());
    const doc = {
      id: uid(),
      name: me.username,
      title: title || "",
      message: message || "",
      createdAt: Date.now(),
      editedAt: null,
      pinned: false,
      likes: 0,
      likedBy: [],
      comments: [],
      roleAtPost: me.role
    };
    write([doc, ...list].slice(0, 500)); // keep last 500
    render();
    return doc;
  }

  function toggleLike(id) {
    const me = currentUser();
    const list = migrate(read());
    const i = list.findIndex(p => p.id === id);
    if (i < 0) return;
    const set = new Set(list[i].likedBy || []);
    set.has(me.username) ? set.delete(me.username) : set.add(me.username);
    list[i].likedBy = [...set];
    list[i].likes = list[i].likedBy.length;
    write(list);
    render();
  }

  function addComment(id, text) {
    const me = currentUser();
    const list = migrate(read());
    const i = list.findIndex(p => p.id === id);
    if (i < 0) return;
    (list[i].comments ||= []).push({ id: uid(), user: me.username, text, createdAt: Date.now() });
    write(list);
    render();
  }

  function canModerate(post) {
    const me = currentUser();
    return me.role === "landlord" || (post.name || "").toLowerCase() === me.username.toLowerCase();
    }

  function togglePin(id) {
    const list = migrate(read());
    const i = list.findIndex(p => p.id === id);
    if (i < 0) return;
    if (!canModerate(list[i])) return toast("You don’t have permission to pin this.");
    list[i].pinned = !list[i].pinned;
    write(list);
    render();
  }

  function removePost(id) {
    const list = migrate(read());
    const i = list.findIndex(p => p.id === id);
    if (i < 0) return;
    if (!canModerate(list[i])) return toast("You don’t have permission to delete this.");
    list.splice(i, 1);
    write(list);
    render();
  }

  // --------- wire UI ----------
  function bindComposer() {
    if (!elForm) return;
    elForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = (elTitle?.value || "").trim();
      const msg = (elMsg?.value || "").trim();
      if (!msg) return toast("Please enter a message.");
      createPost({ title, message: msg });
      elForm.reset();
      toast("Post published 💬");
    });
    elMsg?.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        elForm.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });
  }

  function bindFilters() {
    elSearch?.addEventListener("input", (e) => { state.q = e.target.value; state.page = 1; render(); });
    elSort?.addEventListener("change", (e) => { state.sort = e.target.value; state.page = 1; render(); });
    elMine?.addEventListener("change", (e) => { state.mine = !!e.target.checked; state.page = 1; render(); });
    elPinned?.addEventListener("change", (e) => { state.pinnedOnly = !!e.target.checked; state.page = 1; render(); });

    elPrev?.addEventListener("click", () => { state.page = Math.max(1, state.page - 1); render(); });
    elNext?.addEventListener("click", () => { state.page = state.page + 1; render(); });
  }

  function bindFeedActions() {
    if (!elFeed) return;

    elFeed.addEventListener("click", (e) => {
      const postEl = e.target.closest("article.post");
      if (!postEl) return;
      const id = postEl.getAttribute("data-id");

      if (e.target.closest(".action-like")) {
        toggleLike(id);
        return;
      }
      if (e.target.closest(".action-toggle-comments")) {
        const sec = postEl.querySelector(".post__comments");
        const btn = e.target.closest(".action-toggle-comments");
        if (sec && btn) {
          const hidden = sec.classList.toggle("hidden");
          btn.setAttribute("aria-expanded", String(!hidden));
        }
        return;
      }
      if (e.target.closest(".action-pin")) {
        togglePin(id);
        return;
      }
      if (e.target.closest(".action-delete")) {
        if (confirm("Delete this post? This cannot be undone.")) removePost(id);
        return;
      }
    });

    // comment form submit
    elFeed.addEventListener("submit", (e) => {
      const form = e.target.closest(".comment-form");
      if (!form) return;
      e.preventDefault();
      const postEl = e.target.closest("article.post");
      const id = postEl?.getAttribute("data-id");
      const input = form.querySelector('input[name="text"]');
      const text = (input?.value || "").trim();
      if (!id || !text) return;
      addComment(id, text);
      input.value = "";
    });
  }

  function bindImportExport() {
    elExport?.addEventListener("click", () => {
      const data = JSON.stringify(migrate(read()), null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: `baylis-community-${Date.now()}.json` });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 300);
    });

    elImport?.addEventListener("change", () => {
      const f = elImport.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result || "[]"));
          if (!Array.isArray(data)) throw new Error("Invalid JSON");
          write(migrate(data));
          toast("Imported community posts");
          render();
        } catch {
          toast("Invalid file format");
        } finally {
          elImport.value = "";
        }
      };
      reader.readAsText(f);
    });
  }

  // --------- boot ----------
  function boot() {
    migrate(read());   // ensure schema once
    bindComposer();
    bindFilters();
    bindFeedActions();
    bindImportExport();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
