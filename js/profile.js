// js/profile.js
window.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE || 'http://localhost:4000/api';

  // ---- Current user context
  const username = (localStorage.getItem('username') || 'User').trim();
  const role = (localStorage.getItem('role') || 'resident').toLowerCase();
  const userKey = `profile:${username}`; // per-user profile blob

  // ---- Elements
  const avatarImg       = $('#profileAvatar');
  const avatarInput     = $('#avatarInput');

  const nameEl          = $('#profileName');
  const roleEl          = $('#profileRole');
  const statRole        = $('#statRole');
  const statReq         = $('#statRequests');
  const statPosts       = $('#statPosts');

  const aboutForm       = $('#aboutForm');
  const aboutDisplay    = $('#aboutDisplayName');
  const aboutUnit       = $('#aboutUnit');
  const aboutBio        = $('#aboutBio');
  const aboutMsg        = $('#aboutMsg');

  const contactForm     = $('#contactForm');
  const contactEmail    = $('#contactEmail');
  const contactPhone    = $('#contactPhone');
  const contactPref     = $('#contactPref');
  const contactMsg      = $('#contactMsg');

  const prefsForm       = $('#prefsForm');
  const prefEmail       = $('#prefEmailUpdates');
  const prefVisible     = $('#prefCommunityVisible');
  const prefsMsg        = $('#prefsMsg');

  const listReq         = $('#activityRequests');
  const listPosts       = $('#activityPosts');

  // ---- Init profile header
  const capRole = role.charAt(0).toUpperCase() + role.slice(1);
  if (nameEl) nameEl.textContent = username;
  if (roleEl) roleEl.textContent = capRole;
  if (statRole) statRole.textContent = `Role: ${capRole}`;
  document.title = `Profile • ${username} | Baylis Properties`;

  // ---- Load + hydrate local profile
  let profile = loadProfile();
  hydrateProfile(profile);

  // ---- Avatar upload & preview (saved as data URL in localStorage)
  avatarInput?.addEventListener('change', async () => {
    const file = avatarInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Please choose an image file.');

    const dataUrl = await fileToDataURL(file);
    // (Optional) simple downscale for huge images
    const scaled = await scaleImage(dataUrl, 256); // max 256px
    avatarImg.src = scaled;

    // Update header avatar if present
    const headerAvatar = document.querySelector('.avatar-btn img, .avatar img');
    if (headerAvatar) headerAvatar.src = scaled;

    profile.avatar = scaled;
    saveProfile(profile);
    toast('🖼️ Avatar updated');
  });

  // ---- ABOUT form
  aboutForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const displayName = (aboutDisplay?.value || '').trim();
    profile.about.displayName = displayName || username;
    profile.about.unit = (aboutUnit?.value || '').trim();
    profile.about.bio = (aboutBio?.value || '').trim();
    saveProfile(profile);

    if (nameEl && displayName) nameEl.textContent = displayName;
    setMsg(aboutMsg, '✅ About saved', true);
  });

  // ---- CONTACT form
  contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    profile.contact.email = (contactEmail?.value || '').trim();
    profile.contact.phone = (contactPhone?.value || '').trim();
    profile.contact.pref  = (contactPref?.value || 'email');
    saveProfile(profile);
    setMsg(contactMsg, '✅ Contact saved', true);
  });

  // ---- PREFS form
  prefsForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    profile.prefs.emailUpdates = !!prefEmail?.checked;
    profile.prefs.communityVisible = !!prefVisible?.checked;
    saveProfile(profile);
    setMsg(prefsMsg, '✅ Preferences saved', true);
  });

  // ---- Load activity (requests + posts). Uses token; residents get own, landlords filtered by name.
  loadActivity().catch(() => {
    // Non-fatal; leave defaults
  });

  // =====================================================================================
  // Helpers
  // =====================================================================================

  function $(sel) { return document.querySelector(sel); }

  function toast(text) {
    if (typeof window.showToast === 'function') return window.showToast(text);
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 80);
    setTimeout(() => el.remove(), 3200);
  }

  function setMsg(node, text, ok=false) {
    if (!node) return;
    node.textContent = text;
    node.style.color = ok ? '#28a745' : '#e74c3c';
    setTimeout(() => { node.textContent=''; node.style.color=''; }, 2200);
  }

  function loadProfile() {
    // default shape
    const def = {
      about:   { displayName: username, unit: '', bio: '' },
      contact: { email: '', phone: '', pref: 'email' },
      prefs:   { emailUpdates: true, communityVisible: true },
      avatar:  null
    };
    try {
      const raw = localStorage.getItem(userKey);
      if (!raw) return def;
      const parsed = JSON.parse(raw);
      // shallow merge to survive new fields
      return { ...def, ...parsed, about: { ...def.about, ...parsed.about }, contact: { ...def.contact, ...parsed.contact }, prefs: { ...def.prefs, ...parsed.prefs } };
    } catch { return def; }
  }

  function saveProfile(p) {
    try { localStorage.setItem(userKey, JSON.stringify(p)); } catch {}
  }

  function hydrateProfile(p) {
    // Avatar
    if (p.avatar && avatarImg) {
      avatarImg.src = p.avatar;
      const headerAvatar = document.querySelector('.avatar-btn img, .avatar img');
      if (headerAvatar) headerAvatar.src = p.avatar;
    }

    // About
    if (aboutDisplay) aboutDisplay.value = p.about.displayName || username;
    if (aboutUnit)    aboutUnit.value    = p.about.unit || '';
    if (aboutBio)     aboutBio.value     = p.about.bio || '';

    // Contact
    if (contactEmail) contactEmail.value = p.contact.email || '';
    if (contactPhone) contactPhone.value = p.contact.phone || '';
    if (contactPref)  contactPref.value  = p.contact.pref  || 'email';

    // Prefs
    if (prefEmail)   prefEmail.checked   = !!p.prefs.emailUpdates;
    if (prefVisible) prefVisible.checked = !!p.prefs.communityVisible;
  }

  async function fileToDataURL(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  async function scaleImage(dataUrl, maxSize = 256) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        if (scale >= 1) return resolve(dataUrl);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png', 0.92));
      };
      img.src = dataUrl;
    });
  }

  async function authedFetch(path, options = {}) {
    const token = localStorage.getItem('token');
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      options.headers || {},
      token ? { 'Authorization': `Bearer ${token}` } : {}
    );
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (res.status === 401) {
      toast('Session expired. Please log in again.');
      localStorage.removeItem('token'); localStorage.removeItem('role');
      setTimeout(()=> window.location.href='login.html', 800);
      throw new Error('Unauthorized');
    }
    return res;
  }

  function li(text) {
    const el = document.createElement('li');
    el.className = 'animated';
    el.textContent = text;
    return el;
  }

  async function loadActivity() {
    // Requests
    try {
      const r = await authedFetch('/requests', { method:'GET' });
      if (r.ok) {
        const arr = await r.json();
        const mine = filterMine(arr);
        renderRequests(mine);
        if (statReq) statReq.textContent = `Requests: ${mine.length}`;
      }
    } catch {}

    // Posts
    try {
      const p = await authedFetch('/posts', { method:'GET' });
      if (p.ok) {
        const arr = await p.json();
        const mine = filterMinePosts(arr);
        renderPosts(mine);
        if (statPosts) statPosts.textContent = `Posts: ${mine.length}`;
      }
    } catch {}
  }

  function filterMine(items) {
    // API already restricts to user for residents. For landlords, filter by name match as a fallback.
    return items.filter(x => {
      if (!x) return false;
      if (role === 'resident') return true;
      // landlord: fallback filter by creator name field (case-insensitive)
      return (x.name || '').toLowerCase() === username.toLowerCase();
    });
  }

  function filterMinePosts(posts) {
    if (role === 'resident') return posts.filter(p => (p.name || '').toLowerCase() === username.toLowerCase());
    // landlord: show user-authored posts first
    return posts.filter(p => (p.name || '').toLowerCase() === username.toLowerCase());
  }

  function renderRequests(arr) {
    if (!listReq) return;
    listReq.innerHTML = '';
    if (!arr.length) {
      listReq.innerHTML = '<li class="muted">No activity yet.</li>';
      return;
    }
    arr.forEach(r => {
      const text = r.type === 'cleaning'
        ? `🧼 "${r.cleaningType}" on ${r.date || '—'} — ${r.status || 'open'}`
        : `🛠️ ${r.issue || 'Issue'} — ${r.status || 'open'}`;
      listReq.appendChild(li(text));
    });
  }

  function renderPosts(arr) {
    if (!listPosts) return;
    listPosts.innerHTML = '';
    if (!arr.length) {
      listPosts.innerHTML = '<li class="muted">No posts yet.</li>';
      return;
    }
    arr.forEach(p => {
      const el = document.createElement('li');
      el.className = 'animated';
      el.innerHTML = `💬 <strong>${p.name}</strong>: ${escapeHtml(p.message || '')}`;
      listPosts.appendChild(el);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }
});
