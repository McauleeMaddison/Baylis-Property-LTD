// js/settings.js
window.addEventListener('DOMContentLoaded', async () => {
  const API_BASE = (document.body?.getAttribute('data-api-base') || window.API_BASE || '/api');
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const getCsrfToken = () => {
    const match = document.cookie.match(/(?:^|;)\s*csrfToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  const form = $('#settingsForm');
  const msg = $('#settingsMsg');

  const showTips = $('#showTips');
  const defaultLanding = $('#defaultLanding');
  const timeFormat = $('#timeFormat');

  const darkModeSetting = $('#darkModeSetting');
  const accentColor = $('#accentColor');
  const uiDensity = $('#uiDensity');
  const baseFontSize = $('#baseFontSize');
  const cornerRadius = $('#cornerRadius');

  const notifRequests = $('#notifRequests');
  const notifCommunity = $('#notifCommunity');
  const notifDigest = $('#notifDigest');
  const digestDay = $('#digestDay');

  const currentPw = $('#currentPassword');
  const newPw = $('#newPassword');
  const confirmNewPw = $('#confirmNewPassword');
  const changePwBtn = $('#changePasswordBtn');
  const signOutAllBtn = $('#signOutAllBtn');
  const exportDataBtn = $('#exportDataBtn');
  const clearLocalBtn = $('#clearLocalBtn');
  const resetDefaultsBtn = $('#resetDefaults');

  const previewBtnPrimary = $('#previewBtnPrimary');
  const previewBtnGhost = $('#previewBtnGhost');

  const headerDarkToggle = $('#darkModeToggle');
  const headerDarkIcon = $('#darkModeIcon');

  const DEFAULTS = {
    general: {
      showTips: false,
      defaultLanding: 'settings.html',
      timeFormat: '24h'
    },
    appearance: {
      darkMode: localStorage.getItem('darkMode') === 'true',
      accentColor: '#4a90e2',
      uiDensity: 'comfortable',
      baseFontSize: 16,
      cornerRadius: 12
    },
    notifications: {
      requests: true,
      community: false,
      digest: false,
      digestDay: 'Monday'
    }
  };

  let settings = loadSettings();

  const authedUser = await guard();
  if (!authedUser) return;

  hydrateForm(settings);
  applySettings(settings, { preview: true, persist: false });

  accentColor?.addEventListener('input', () => {
    settings.appearance.accentColor = accentColor.value;
    applySettings(settings, { persist: false });
  });
  baseFontSize?.addEventListener('change', () => {
    settings.appearance.baseFontSize = parseInt(baseFontSize.value, 10) || 16;
    applySettings(settings, { persist: false });
  });
  cornerRadius?.addEventListener('input', () => {
    settings.appearance.cornerRadius = parseInt(cornerRadius.value, 10) || 12;
    applySettings(settings, { persist: false });
  });
  uiDensity?.addEventListener('change', () => {
    settings.appearance.uiDensity = uiDensity.value;
    applySettings(settings, { persist: false });
  });
  darkModeSetting?.addEventListener('change', () => {
    settings.appearance.darkMode = !!darkModeSetting.checked;
    applySettings(settings, { persist: false });
  });

  notifDigest?.addEventListener('change', () => {
    digestDay.disabled = !notifDigest.checked;
  });
  digestDay.disabled = !settings.notifications.digest;

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    settings = readFormToSettings(settings);
    saveSettings(settings);
    applySettings(settings, { preview: true, persist: false });
    setMsg('✅ Settings saved! Reload to apply everywhere.');
    setTimeout(() => setMsg(''), 2500);
  });

  resetDefaultsBtn?.addEventListener('click', () => {
    if (!confirm('Reset all settings to defaults?')) return;
    settings = structuredClone(DEFAULTS);
    saveSettings(settings);
    hydrateForm(settings);
    applySettings(settings, { preview: true, persist: false });
    setMsg('🔁 Settings reset to defaults.');
    setTimeout(() => setMsg(''), 2000);
  });

  changePwBtn?.addEventListener('click', async () => {
    const current = currentPw?.value || '';
    const next = newPw?.value || '';
    const confirm = confirmNewPw?.value || '';
    if (!current || !next || !confirm) return toast('Fill all password fields.');
    if (next.length < 6) return toast('New password must be at least 6 characters.');
    if (next !== confirm) return toast('Passwords do not match.');

    try {
      const res = await authedFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current, password: next })
      });
      if (res?.ok) {
        toast('🔒 Password updated');
        currentPw.value = newPw.value = confirmNewPw.value = '';
      } else {
        const data = await res?.json().catch(()=> ({}));
        if (res?.status === 404) toast('Endpoint not implemented yet. (Create POST /api/auth/change-password)');
        else toast(data?.error || 'Could not update password.');
      }
    } catch {
      toast('Network error.');
    }
    }
  });

  signOutAllBtn?.addEventListener('click', async () => {
    try {
      const res = await authedFetch('/auth/logout-all', { method: 'POST' });
      const res = await authedFetch('/auth/logout-all', { method: 'POST' });
      if (!res?.ok) throw new Error();
    } catch {}
    localStorage.removeItem('token');
    toast('🧹 Signed out. Please log in again.');
    setTimeout(() => (window.location.href = 'login.html'), 800);
  });

  exportDataBtn?.addEventListener('click', async () => {
      exportedAt: new Date().toISOString(),
      user: {
        username: localStorage.getItem('username') || null,
        role: localStorage.getItem('role') || null
      },
      settings,
      data: {}
      settings,
      data: {}
    };
    try {
      const [reqRes, postRes] = await Promise.all([
        authedFetch('/requests', { method: 'GET' }),
        authedFetch('/posts', { method: 'GET' })
      ]);
      if (reqRes?.ok) payload.data.requests = await reqRes.json();
      if (postRes?.ok) payload.data.posts = await postRes.json();
    } catch {}
    downloadJSON(payload, `baylis-export-${Date.now()}.json`);
    toast('📁 Export started');
  });

  clearLocalBtn?.addEventListener('click', () => {ything, list keys here
    if (!confirm('Clear local app data (including login token)?')) return;
    const keepKeys = [];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(k => {
      if (!keepKeys.includes(k)) localStorage.removeItem(k);
    });
    toast('🧼 Local data cleared');
    setTimeout(() => (window.location.href = 'login.html'), 700);
  });

  async function guard() {tch(`${API_BASE}/auth/me`, { credentials: 'include' });
      if (!res.ok) throw new Error('auth');
      const { user } = await res.json();
      if (!user) throw new Error('no-user');
      const name = user.profile?.displayName || user.email?.split('@')[0] || 'User';
      document.title = `Settings • ${name} | Baylis Property LTD`;
      return user;
    } catch {
      window.location.replace('/login');
      return null;
    }
  }

  function loadSettings() {
    // Try namespaced blob first
  function loadSettings() {
    try {
      const raw = localStorage.getItem('appSettings');
      if (!raw) return structuredClone(DEFAULTS);
      const parsed = JSON.parse(raw);
      return deepMerge(structuredClone(DEFAULTS), parsed);
    } catch {
      return structuredClone(DEFAULTS);
    }
  }

  function saveSettings(s) {
    try { localStorage.setItem('appSettings', JSON.stringify(s)); } catch {}
    localStorage.setItem('darkMode', s.appearance.darkMode ? 'true' : 'false');
  }

  function hydrateForm(s) {checked = !!s.general.showTips;
    if (defaultLanding) defaultLanding.value = s.general.defaultLanding;
    if (timeFormat) timeFormat.value = s.general.timeFormat;

    // Appearance
    if (darkModeSetting) darkModeSetting.checked = !!s.appearance.darkMode;
    if (accentColor) accentColor.value = s.appearance.accentColor;
    if (uiDensity) uiDensity.value = s.appearance.uiDensity;
    if (baseFontSize) baseFontSize.value = String(s.appearance.baseFontSize);
    if (cornerRadius) cornerRadius.value = String(s.appearance.cornerRadius);

    // Notifications
    if (notifRequests) notifRequests.checked = !!s.notifications.requests;
    if (notifCommunity) notifCommunity.checked = !!s.notifications.community;
    if (notifDigest) notifDigest.checked = !!s.notifications.digest;
    if (digestDay) {
      digestDay.value = s.notifications.digestDay;
      digestDay.disabled = !s.notifications.digest;
    }
  }

  function readFormToSettings(s) {
    const out = structuredClone(s);

    // General
    if (showTips) out.general.showTips = !!showTips.checked;
    if (defaultLanding) out.general.defaultLanding = defaultLanding.value || 'settings.html';
    if (timeFormat) out.general.timeFormat = timeFormat.value || '24h';

    // Appearance
    if (darkModeSetting) out.appearance.darkMode = !!darkModeSetting.checked;
    if (accentColor) out.appearance.accentColor = accentColor.value || '#4a90e2';
    if (uiDensity) out.appearance.uiDensity = uiDensity.value || 'comfortable';
    if (baseFontSize) out.appearance.baseFontSize = parseInt(baseFontSize.value, 10) || 16;
    if (cornerRadius) out.appearance.cornerRadius = parseInt(cornerRadius.value, 10) || 12;

    // Notifications
    if (notifRequests) out.notifications.requests = !!notifRequests.checked;
    if (notifCommunity) out.notifications.community = !!notifCommunity.checked;
    if (notifDigest) out.notifications.digest = !!notifDigest.checked;
    if (digestDay) out.notifications.digestDay = digestDay.value || 'Monday';

    return out;
  }

  function applySettings(s, { preview = false, persist = false } = {}) {
    // Dark
    document.body.classList.toggle('dark', !!s.appearance.darkMode);
    headerDarkToggle && (headerDarkToggle.checked = !!s.appearance.darkMode);
    headerDarkIcon && (headerDarkIcon.textContent = s.appearance.darkMode ? '🌙' : '🌞');
    if (persist) localStorage.setItem('darkMode', s.appearance.darkMode ? 'true' : 'false');

    // Accent
    document.documentElement.style.setProperty('--secondary', s.appearance.accentColor);

    // Corner radius
    document.documentElement.style.setProperty('--radius', `${s.appearance.cornerRadius}px`);

    // Base font size
    document.documentElement.style.fontSize = `${s.appearance.baseFontSize}px`;

    // Density CSS (inject/update once)
    ensureDensityStyles();
    document.body.setAttribute('data-density', s.appearance.uiDensity);

    // Live preview text color tweak (optional)
    if (preview) {
      // Buttons use var(--secondary) already; nothing else needed.
      previewBtnPrimary?.classList.add('animated');
      setTimeout(()=> previewBtnPrimary?.classList.remove('animated'), 300);
    }
  }

  function ensureDensityStyles() {
    if (document.getElementById('density-style')) return;
    const css = `
      body[data-density="compact"] .dashboard-card,
      body[data-density="compact"] .settings-form { padding: 0.9rem; }
      body[data-density="compact"] form input,
      body[data-density="compact"] form textarea,
      body[data-density="compact"] form select { padding: 0.55rem; }

      body[data-density="spacious"] .dashboard-card,
      body[data-density="spacious"] .settings-form { padding: 1.6rem; }
      body[data-density="spacious"] form input,
      body[data-density="spacious"] form textarea,
      body[data-density="spacious"] form select { padding: 0.95rem; }
    `;
    const style = document.createElement('style');
    style.id = 'density-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---- Messaging / Toast
  function setMsg(text) {
    if (!msg) return;
    msg.textContent = text;
    msg.setAttribute('role','alert');
    msg.setAttribute('aria-live','assertive');
    msg.focus?.();
  }
  function toast(t) {
    // Leverage global showToast from script.js if available
    if (typeof window.showToast === 'function') return window.showToast(t);
    // Fallback mini-toast
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = t;
    document.body.appendChild(el);
    setTimeout(()=> el.classList.add('show'), 100);
    setTimeout(()=> el.remove(), 3200);
  }

  // ---- Networking helpers
  async function authedFetch(path, options = {}) {
    const token = localStorage.getItem('token');
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      options.headers || {},
      token ? { 'Authorization': `Bearer ${token}` } : {}
    );
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
    try {
      const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      if (res.status === 401) {
        toast('Session expired. Please log in again.');
        localStorage.removeItem('token'); localStorage.removeItem('role');
        setTimeout(()=> window.location.href='login.html', 800);
        return null;
      }
      return res;
    } catch (e) {
      return null;
    }
  }

  function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  // ---- Utility
  function deepMerge(base, ext) {
    for (const k in ext) {
      if (!Object.prototype.hasOwnProperty.call(ext, k)) continue;
      if (isObj(base[k]) && isObj(ext[k])) base[k] = deepMerge(base[k], ext[k]);
      else base[k] = ext[k];
    }
    return base;
  }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
});
