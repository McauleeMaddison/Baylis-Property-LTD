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
    const exportDataBtn = $("#exportDataBtn");
    const clearLocalBtn = $("#clearLocalBtn");
    const resetDefaultsBtn = $("#resetDefaults");

    const twoFaStatusText = $("#twoFaStatusText");
    const twoFaMeta = $("#twoFaMeta");
    const twoFaEnableBtn = $("#twoFaEnableBtn");
    const twoFaDisableBtn = $("#twoFaDisableBtn");
    const twoFaFlow = $("#twoFaFlow");
    const twoFaCode = $("#twoFaCode");
    const twoFaVerifyBtn = $("#twoFaVerifyBtn");
    const twoFaCancelBtn = $("#twoFaCancelBtn");
    const twoFaResendBtn = $("#twoFaResendBtn");
    const twoFaCountdown = $("#twoFaCountdown");

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
    const TWO_FA_RESEND_SECONDS = 45;
    const twoFaState = {
      enabled: false,
      challenge: null,
      timer: null,
      remaining: 0,
    };

    const user = await guard();
    if (!user) return;

    twoFaState.enabled = !!(user.settings?.security?.twoFactorEnabled);
    updateTwoFaStatus();

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
    twoFaEnableBtn?.addEventListener("click", () => startTwoFaChallenge("enable"));
    twoFaDisableBtn?.addEventListener("click", () => startTwoFaChallenge("disable"));
    twoFaVerifyBtn?.addEventListener("click", verifyTwoFactorCode);
    twoFaCancelBtn?.addEventListener("click", () => resetTwoFaFlow());
    twoFaResendBtn?.addEventListener("click", resendTwoFactorCode);

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

    function twoFaActionLabel(mode) {
      return mode === "disable" ? "disable" : "enable";
    }

    async function startTwoFaChallenge(mode) {
      if (twoFaState.challenge) {
        toast("Complete the current verification first.");
        return;
      }
      const endpoint = mode === "disable" ? "/auth/twofactor/disable" : "/auth/twofactor/setup";
      const res = await authedFetch(endpoint, { method: "POST" });
      if (!res) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data?.error || "Unable to start verification.");
        return;
      }
      twoFaState.challenge = {
        id: data.challengeId,
        delivery: data.delivery || "email",
        mode
      };
      if (twoFaFlow) twoFaFlow.classList.remove("hidden");
      twoFaCode?.focus();
      updateTwoFaMeta();
      startTwoFaCountdown();
    }

    async function verifyTwoFactorCode() {
      if (!twoFaState.challenge) return;
      const code = (twoFaCode?.value || "").trim();
      if (!code || code.length < 6) {
        toast("Enter the 6-digit verification code.");
        return;
      }
      twoFaVerifyBtn && (twoFaVerifyBtn.disabled = true);
      try {
        const res = await authedFetch("/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({ challengeId: twoFaState.challenge.id, code })
        });
        if (!res) return;
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast(data?.error || "Invalid verification code.");
          return;
        }
        if (typeof data?.twoFactorEnabled === "boolean") {
          twoFaState.enabled = data.twoFactorEnabled;
        } else if (twoFaState.challenge.mode === "enable") {
          twoFaState.enabled = true;
        } else if (twoFaState.challenge.mode === "disable") {
          twoFaState.enabled = false;
        }
        toast(twoFaState.enabled ? "🔐 Two-factor enabled." : "Two-factor disabled.");
        resetTwoFaFlow(true);
        updateTwoFaStatus();
      } finally {
        twoFaVerifyBtn && (twoFaVerifyBtn.disabled = false);
      }
    }

    async function resendTwoFactorCode() {
      if (!twoFaState.challenge || twoFaResendBtn?.disabled) return;
      twoFaResendBtn.disabled = true;
      try {
        const res = await authedFetch("/auth/resend-otp", {
          method: "POST",
          body: JSON.stringify({ challengeId: twoFaState.challenge.id })
        });
        if (!res) {
          twoFaResendBtn.disabled = false;
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast(data?.error || "Unable to resend code.");
          twoFaResendBtn.disabled = false;
          return;
        }
        twoFaState.challenge.id = data.challengeId;
        twoFaState.challenge.delivery = data.delivery || twoFaState.challenge.delivery;
        toast("Sent a fresh verification code.");
        updateTwoFaMeta();
        startTwoFaCountdown();
      } catch {
        twoFaResendBtn.disabled = false;
        toast("Unable to resend code right now.");
      }
    }

    function startTwoFaCountdown(seconds = TWO_FA_RESEND_SECONDS) {
      clearInterval(twoFaState.timer);
      twoFaState.remaining = seconds;
      updateTwoFaCountdown();
      twoFaResendBtn && (twoFaResendBtn.disabled = true);
      twoFaState.timer = setInterval(() => {
        twoFaState.remaining -= 1;
        updateTwoFaCountdown();
        if (twoFaState.remaining <= 0) {
          clearInterval(twoFaState.timer);
          twoFaState.timer = null;
          twoFaCountdown && (twoFaCountdown.textContent = "You can resend a code now.");
          twoFaResendBtn && (twoFaResendBtn.disabled = false);
        }
      }, 1000);
    }

    function updateTwoFaCountdown() {
      if (!twoFaCountdown) return;
      if (twoFaState.remaining <= 0) {
        twoFaCountdown.textContent = "";
      } else {
        twoFaCountdown.textContent = `Resend available in ${twoFaState.remaining}s.`;
      }
    }

    function resetTwoFaFlow(success = false) {
      clearInterval(twoFaState.timer);
      twoFaState.timer = null;
      twoFaState.challenge = null;
      twoFaCode && (twoFaCode.value = "");
      if (twoFaFlow && !twoFaState.challenge) twoFaFlow.classList.add("hidden");
      twoFaResendBtn && (twoFaResendBtn.disabled = false);
      twoFaCountdown && (twoFaCountdown.textContent = "");
      updateTwoFaMeta(success ? "Status updated." : "");
    }

    function updateTwoFaStatus() {
      if (twoFaStatusText) twoFaStatusText.textContent = twoFaState.enabled ? "Enabled" : "Disabled";
      if (twoFaEnableBtn) twoFaEnableBtn.disabled = twoFaState.enabled;
      if (twoFaDisableBtn) twoFaDisableBtn.disabled = !twoFaState.enabled;
      updateTwoFaMeta();
    }

    function updateTwoFaMeta(extraMessage = "") {
      if (!twoFaMeta) return;
      if (twoFaState.challenge) {
        const channel = twoFaState.challenge.delivery === "sms" ? "text message" : "email";
        const verb = twoFaActionLabel(twoFaState.challenge.mode);
        twoFaMeta.textContent = `Enter the code we sent via ${channel} to ${verb} two-factor authentication. ${extraMessage}`.trim();
      } else {
        twoFaMeta.textContent = twoFaState.enabled
          ? "Two-factor is active. You’ll enter a code at login."
          : "Add a verification challenge after your password to keep intruders out.";
        if (extraMessage) twoFaMeta.textContent += ` ${extraMessage}`;
      }
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
      const csrf = getCsrfToken();
      if (csrf) headers["X-CSRF-Token"] = csrf;

      try {
        const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
        if (res.status === 401) {
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
