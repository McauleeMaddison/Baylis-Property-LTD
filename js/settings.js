// js/settings.js
(function () {
  "use strict";

  const ready = async () => {
    const API_BASE = document.body?.getAttribute("data-api-base") || window.API_BASE || "/api";
    const $ = (sel, ctx = document) => ctx.querySelector(sel);

    const form = $("#settingsForm");
    const msg = $("#settingsMsg");

    const showTips = $("#showTips");
    const defaultLanding = $("#defaultLanding");
    const timeFormat = $("#timeFormat");

    const darkModeSetting = $("#darkModeSetting");
    const accentColor = $("#accentColor");
    const uiDensity = $("#uiDensity");
    const baseFontSize = $("#baseFontSize");
    const cornerRadius = $("#cornerRadius");

    const notifRequests = $("#notifRequests");
    const notifCommunity = $("#notifCommunity");
    const notifDigest = $("#notifDigest");
    const digestDay = $("#digestDay");

    const currentPw = $("#currentPassword");
    const newPw = $("#newPassword");
    const confirmNewPw = $("#confirmNewPassword");
    const changePwBtn = $("#changePasswordBtn");
    const signOutAllBtn = $("#signOutAllBtn");
    const sessionList = $("#sessionList");
    const sessionRefreshBtn = $("#sessionRefreshBtn");
    const exportDataBtn = $("#exportDataBtn");
    const clearLocalBtn = $("#clearLocalBtn");
    const resetDefaultsBtn = $("#resetDefaults");

    const previewBtnPrimary = $("#previewBtnPrimary");
    const previewBtnGhost = $("#previewBtnGhost");

    const headerDarkToggle = $("#darkModeToggle");
    const headerDarkIcon = $("#darkModeIcon");

    const DEFAULTS = Object.freeze({
      general: {
        showTips: false,
        defaultLanding: "resident.html",
        timeFormat: "24h"
      },
      appearance: {
        darkMode: localStorage.getItem("darkMode") === "true",
        accentColor: "#d4af37",
        uiDensity: "comfortable",
        baseFontSize: 16,
        cornerRadius: 12
      },
      notifications: {
        requests: true,
        community: true,
        digest: false,
        digestDay: "Monday"
      }
    });

    let settings = loadSettings(DEFAULTS);
    const user = await guard();
    if (!user) return;

    hydrateForm(settings);
    applySettings(settings, { persist: false, preview: true });

    accentColor?.addEventListener("input", () => {
      settings.appearance.accentColor = accentColor.value || DEFAULTS.appearance.accentColor;
      applySettings(settings, { persist: false, preview: true });
    });
    baseFontSize?.addEventListener("change", () => {
      settings.appearance.baseFontSize = clamp(parseInt(baseFontSize.value, 10) || DEFAULTS.appearance.baseFontSize, 12, 22);
      applySettings(settings, { persist: false, preview: true });
    });
    cornerRadius?.addEventListener("input", () => {
      settings.appearance.cornerRadius = clamp(parseInt(cornerRadius.value, 10) || DEFAULTS.appearance.cornerRadius, 6, 24);
      applySettings(settings, { persist: false, preview: true });
    });
    uiDensity?.addEventListener("change", () => {
      settings.appearance.uiDensity = uiDensity.value || DEFAULTS.appearance.uiDensity;
      applySettings(settings, { persist: false, preview: true });
    });
    darkModeSetting?.addEventListener("change", () => {
      settings.appearance.darkMode = !!darkModeSetting.checked;
      applySettings(settings, { preview: true });
    });
    notifDigest?.addEventListener("change", () => {
      digestDay.disabled = !notifDigest.checked;
    });
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      settings = readForm(settings);
      saveSettings(settings);
      applySettings(settings, { preview: true });
      setMsg("✅ Settings saved!");
      setTimeout(() => setMsg(""), 2200);
    });

    resetDefaultsBtn?.addEventListener("click", () => {
      if (!confirm("Reset all settings to their defaults?")) return;
      settings = structuredClone(DEFAULTS);
      saveSettings(settings);
      hydrateForm(settings);
      applySettings(settings, { preview: true });
      setMsg("🔁 Settings reset to defaults.");
      setTimeout(() => setMsg(""), 2200);
    });

    changePwBtn?.addEventListener("click", async () => {
      const current = (currentPw?.value || "").trim();
      const next = (newPw?.value || "").trim();
      const confirmNext = (confirmNewPw?.value || "").trim();

      if (!current || !next || !confirmNext) return toast("Fill in all password fields.");
      if (next.length < 6) return toast("Password must be at least 6 characters.");
      if (next !== confirmNext) return toast("Passwords do not match.");

      try {
        const res = await authedFetch("/auth/change-password", {
          method: "POST",
          body: JSON.stringify({ current, password: next })
        });
        if (!res) return;
        if (res.ok) {
          toast("🔒 Password updated.");
          currentPw.value = newPw.value = confirmNewPw.value = "";
        } else if (res.status === 404) {
          toast("Endpoint not implemented yet (POST /api/auth/change-password).");
        } else {
          const data = await res.json().catch(() => ({}));
          toast(data?.error || "Unable to update password.");
        }
      } catch {
        toast("Network error. Please try again.");
      }
    });

    signOutAllBtn?.addEventListener("click", async () => {
      try { await authedFetch("/auth/logout-all", { method: "POST" }); } catch {}
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      toast("🧼 Signed out everywhere. Please log in again.");
      setTimeout(() => (window.location.href = "login.html"), 900);
    });

    sessionRefreshBtn?.addEventListener("click", loadSessions);

    exportDataBtn?.addEventListener("click", async () => {
      const payload = {
        exportedAt: new Date().toISOString(),
        settings,
        user: {
          username: localStorage.getItem("username") || null,
          role: localStorage.getItem("role") || null
        },
        data: {}
      };
      try {
        const [requestsRes, postsRes] = await Promise.all([
          authedFetch("/requests", { method: "GET" }),
          authedFetch("/posts", { method: "GET" })
        ]);
        if (requestsRes?.ok) payload.data.requests = await requestsRes.json();
        if (postsRes?.ok) payload.data.posts = await postsRes.json();
      } catch {}
      downloadJSON(payload, `baylis-export-${Date.now()}.json`);
      toast("📁 Export started.");
    });

    clearLocalBtn?.addEventListener("click", () => {
      if (!confirm("Clear local app data (sign out, preferences, cached forms)?")) return;
      const keep = [];
      Object.keys(localStorage).forEach((key) => {
        if (!keep.includes(key)) localStorage.removeItem(key);
      });
      toast("🧽 Local data cleared.");
      setTimeout(() => (window.location.href = "login.html"), 900);
    });

    if (sessionList) {
      sessionList.addEventListener("click", async (event) => {
        const btn = event.target?.closest("button[data-session]");
        if (!btn) return;
        const sid = btn.getAttribute("data-session");
        if (!sid) return;
        btn.disabled = true;
        try {
          const res = await authedFetch("/auth/sessions/revoke", {
            method: "POST",
            body: JSON.stringify({ sid })
          });
          if (res?.ok) {
            toast("Session revoked.");
            loadSessions();
            return;
          }
          const data = await res?.json().catch(() => ({}));
          toast(data?.error || "Unable to revoke session.");
        } catch {
          toast("Network error.");
        } finally {
          btn.disabled = false;
        }
      });
    }

    function loadSettings(defaults) {
      try {
        const raw = localStorage.getItem("appSettings");
        if (!raw) return structuredClone(defaults);
        const parsed = JSON.parse(raw);
        return deepMerge(structuredClone(defaults), parsed);
      } catch {
        return structuredClone(defaults);
      }
    }

    function saveSettings(data) {
      try { localStorage.setItem("appSettings", JSON.stringify(data)); } catch {}
      try { localStorage.setItem("darkMode", data.appearance.darkMode ? "true" : "false"); } catch {}
    }

    function hydrateForm(data) {
      if (showTips) showTips.checked = !!data.general.showTips;
      if (defaultLanding) defaultLanding.value = data.general.defaultLanding;
      if (timeFormat) timeFormat.value = data.general.timeFormat;

      if (darkModeSetting) darkModeSetting.checked = !!data.appearance.darkMode;
      if (accentColor) accentColor.value = data.appearance.accentColor;
      if (uiDensity) uiDensity.value = data.appearance.uiDensity;
      if (baseFontSize) baseFontSize.value = String(data.appearance.baseFontSize);
      if (cornerRadius) cornerRadius.value = String(data.appearance.cornerRadius);

      if (notifRequests) notifRequests.checked = !!data.notifications.requests;
      if (notifCommunity) notifCommunity.checked = !!data.notifications.community;
      if (notifDigest) notifDigest.checked = !!data.notifications.digest;
      if (digestDay) {
        digestDay.value = data.notifications.digestDay;
        digestDay.disabled = !data.notifications.digest;
      }
    }

    function readForm(seed) {
      const out = structuredClone(seed);
      if (showTips) out.general.showTips = !!showTips.checked;
      if (defaultLanding) out.general.defaultLanding = defaultLanding.value || DEFAULTS.general.defaultLanding;
      if (timeFormat) out.general.timeFormat = timeFormat.value || DEFAULTS.general.timeFormat;

      if (darkModeSetting) out.appearance.darkMode = !!darkModeSetting.checked;
      if (accentColor) out.appearance.accentColor = accentColor.value || DEFAULTS.appearance.accentColor;
      if (uiDensity) out.appearance.uiDensity = uiDensity.value || DEFAULTS.appearance.uiDensity;
      if (baseFontSize) out.appearance.baseFontSize = clamp(parseInt(baseFontSize.value, 10) || DEFAULTS.appearance.baseFontSize, 12, 22);
      if (cornerRadius) out.appearance.cornerRadius = clamp(parseInt(cornerRadius.value, 10) || DEFAULTS.appearance.cornerRadius, 6, 24);

      if (notifRequests) out.notifications.requests = !!notifRequests.checked;
      if (notifCommunity) out.notifications.community = !!notifCommunity.checked;
      if (notifDigest) out.notifications.digest = !!notifDigest.checked;
      if (digestDay) out.notifications.digestDay = digestDay.value || DEFAULTS.notifications.digestDay;
      return out;
    }

    function applySettings(data, opts = {}) {
      const { persist = true, preview = false } = opts;
      document.body.classList.toggle("dark", !!data.appearance.darkMode);
      headerDarkToggle && (headerDarkToggle.checked = !!data.appearance.darkMode);
      headerDarkIcon && (headerDarkIcon.textContent = data.appearance.darkMode ? "🌙" : "🌞");
      if (persist) localStorage.setItem("darkMode", data.appearance.darkMode ? "true" : "false");

      setAccentColor(data.appearance.accentColor);
      document.documentElement.setAttribute("data-density", data.appearance.uiDensity || "comfortable");
      document.documentElement.style.fontSize = `${data.appearance.baseFontSize}px`;
      document.documentElement.style.setProperty("--radius", `${data.appearance.cornerRadius}px`);

      if (preview) pulsePreviewButtons();
    }

    function setAccentColor(color) {
      const hex = normalizeHex(color || DEFAULTS.appearance.accentColor);
      const darker = shadeHex(hex, -15);
      document.documentElement.style.setProperty("--secondary", hex);
      document.documentElement.style.setProperty("--secondary-600", darker);
      document.documentElement.style.setProperty("--accent-soft-bg", hex + "22");
      document.documentElement.style.setProperty("--accent-soft-bd", hex + "44");
    }

    function pulsePreviewButtons() {
      [previewBtnPrimary, previewBtnGhost].forEach((btn) => {
        if (!btn) return;
        btn.classList.add("animated");
        setTimeout(() => btn.classList.remove("animated"), 400);
      });
    }

    function setMsg(text) {
      if (!msg) return;
      msg.textContent = text;
      msg.setAttribute("role", "alert");
      msg.setAttribute("aria-live", "assertive");
      if (text) msg.focus?.();
    }

    function toast(text) {
      if (typeof window.showToast === "function") window.showToast(text);
      else alert(text);
    }

    async function guard() {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        if (!res.ok) throw new Error("auth");
        const data = await res.json();
        if (!data?.user) throw new Error("no-user");
        const name = data.user.profile?.displayName || data.user.email || "User";
        document.title = `Settings • ${name} | Baylis Property LTD`;
        return data.user;
      } catch {
        window.location.replace("login.html");
        return null;
      }
    }

    async function loadSessions() {
      if (!sessionList) return;
      sessionList.innerHTML = "<li class=\"muted\">Loading…</li>";
      try {
        const res = await authedFetch("/auth/sessions", { method: "GET" });
        if (!res?.ok) throw new Error("session-fetch");
        const data = await res.json().catch(() => ({}));
        const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
        if (!sessions.length) {
          sessionList.innerHTML = "<li class=\"muted\">No active sessions.</li>";
          return;
        }
        sessionList.innerHTML = "";
        sessions.forEach((sess) => {
          const li = document.createElement("li");
          const when = sess.lastSeen ? new Date(sess.lastSeen).toLocaleString() : "—";
          const current = sess.current ? " (current)" : "";
          li.innerHTML = `
            <div style="display:flex; justify-content:space-between; gap:.5rem; align-items:center; flex-wrap:wrap;">
              <div>
                <strong>${(sess.userAgent || "Unknown device").slice(0, 60)}${current}</strong>
                <div class="muted">${sess.ipAddress || "Unknown IP"} • Last seen ${when}</div>
              </div>
              ${sess.current ? "" : `<button type="button" class="btn btn-ghost btn-small" data-session="${sess.sid}">Revoke</button>`}
            </div>
          `;
          sessionList.appendChild(li);
        });
      } catch {
        sessionList.innerHTML = "<li class=\"muted\">Unable to load sessions.</li>";
      }
    }

    loadSessions();

    function getCsrfToken() {
      const match = document.cookie.match(/(?:^|;)\\s*csrfToken=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : "";
    }

    async function authedFetch(path, options = {}) {
      const token = localStorage.getItem("token");
      const headers = Object.assign(
        { "Content-Type": "application/json" },
        options.headers || {},
        token ? { Authorization: `Bearer ${token}` } : {}
      );

      const request = { ...options, headers, credentials: "include" };

      try {
        const res = typeof window.fetchWithCsrf === "function"
          ? await window.fetchWithCsrf(`${API_BASE}${path}`, { apiBase: API_BASE, ...request })
          : await (async () => {
              const csrf = getCsrfToken();
              if (csrf) request.headers["X-CSRF-Token"] = csrf;
              return fetch(`${API_BASE}${path}`, request);
            })();

        if (res && res.status === 401) {
          toast("Session expired. Please log in again.");
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          setTimeout(() => (window.location.href = "login.html"), 900);
          return null;
        }
        return res;
      } catch {
        toast("Network error.");
        return null;
      }
    }
  };

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  function normalizeHex(hex) {
    const value = String(hex || "").trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return value;
    return "#d4af37";
  }

  function shadeHex(hex, percent) {
    const value = hex.replace("#", "");
    const num = parseInt(value.length === 3 ? value.split("").map(ch => ch + ch).join("") : value, 16);
    const amt = Math.round(2.55 * percent);
    const r = (num >> 16) + amt;
    const g = ((num >> 8) & 0x00ff) + amt;
    const b = (num & 0x0000ff) + amt;
    return "#" + (
      0x1000000 +
      (r < 255 ? (r < 0 ? 0 : r) : 255) * 0x10000 +
      (g < 255 ? (g < 0 ? 0 : g) : 255) * 0x100 +
      (b < 255 ? (b < 0 ? 0 : b) : 255)
    ).toString(16).slice(1);
  }

  function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 400);
  }

  function deepMerge(base, extra) {
    Object.keys(extra || {}).forEach((key) => {
      if (isPlainObject(base[key]) && isPlainObject(extra[key])) base[key] = deepMerge(base[key], extra[key]);
      else base[key] = extra[key];
    });
    return base;
  }

  function isPlainObject(val) {
    return val && typeof val === "object" && !Array.isArray(val);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready, { once: true });
  } else {
    ready();
  }
})();
