// js/login.js
(() => {
  'use strict';

  const API_BASE = (document.body?.getAttribute('data-api-base') || window.API_BASE || '/api');
  const DEMO = {
    resident: { password: 'resident123', redirect: 'index.html' },
    landlord: { password: 'landlord123', redirect: 'landlord.html' }
  };
  const MAX_ATTEMPTS = 5;
  const LOCK_SECONDS = 30;

  // ---- El helpers
  const $  = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // ---- Refs
  const form        = $('#loginForm');
  const usernameEl  = $('#username');
  const passwordEl  = $('#password');
  const roleEl      = $('#roleSelect');
  const rememberEl  = $('#rememberMe');
  const showPwBtn   = $('#showPasswordBtn');
  const msgDiv      = $('#loginMsg');
  const submitBtn   = $('#submitBtn');
  const capsWarn    = $('#capsWarning');

  // OTP step (optional)
  const otpSection  = $('#otpSection');
  const otpCodeEl   = $('#otpCode');
  const otpSubmit   = $('#otpSubmitBtn');
  const otpBack     = $('#otpBackBtn');

  // Forgot password (optional)
  const forgotLink  = $('#forgotPassword');

  // ---- State
  let pendingLogin = null; // { username, role, tmpToken? }
  let lockTimer = null;

  // ---- Init UI (prefill & lock state)
  prefill();
  applyLockState();

  // ---- Events
  showPwBtn?.addEventListener('click', togglePassword);
  passwordEl?.addEventListener('keydown', capsDetector);
  passwordEl?.addEventListener('keyup', capsDetector);

  roleEl?.addEventListener('change', () => {
    // tiny UX: adjust username placeholder per role
    if (!usernameEl) return;
    usernameEl.placeholder = roleEl.value === 'landlord'
      ? 'Landlord username'
      : 'Resident username';
  });

  forgotLink?.addEventListener('click', (e) => {
    e.preventDefault();
    toast('Reset flow not implemented yet. (Create /auth/request-reset)');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isLocked()) return;

    clearMsg();
    const { username, password, role } = readForm();
    const valid = validate({ username, password });
    if (!valid) return;

    setLoading(true);

    try {
      // 1) Try real backend
      const res = await fetchJSON('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, role })
      });

      if (res && res.ok) {
        const data = await res.json();
        // If backend demands OTP, pause here for 2FA
        if (data.require2FA) {
          pendingLogin = { username, role, tmpToken: data.tmpToken || null };
          showOTP();
          setLoading(false);
          return;
        }
        // Otherwise, complete login
        completeLogin({ token: data.token, username, role });
        return;
      }

      // 2) Graceful fallback to DEMO credentials (local only)
      if (DEMO[role] && password === DEMO[role].password) {
        // No token in demo; still set a fake token so the app acts authenticated
        completeLogin({ token: `demo.${role}.${Date.now()}`, username, role, isDemo:true });
        return;
      }

      failAttempt('Invalid credentials. Please try again.');
    } catch (err) {
      // network or server error -> fallback to demo only if credentials match
      if (DEMO[role] && password === DEMO[role].password) {
        completeLogin({ token: `demo.${role}.${Date.now()}`, username, role, isDemo:true });
      } else {
        failAttempt('Unable to reach server. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  });

  // OTP handlers (if you opt-in to 2FA)
  otpSubmit?.addEventListener('click', async () => {
    if (!pendingLogin) return hideOTP();
    const code = (otpCodeEl?.value || '').trim();
    if (!code || code.length < 6) return setMsg('Enter the 6-digit code.', false);

    setLoading(true);
    try {
      // If we had a tmpToken from login, verify against API; else accept demo code 000000
      if (pendingLogin.tmpToken) {
        const res = await fetchJSON('/auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify({ code, tmpToken: pendingLogin.tmpToken })
        });
        if (res && res.ok) {
          const data = await res.json();
          completeLogin({ token: data.token, username: pendingLogin.username, role: pendingLogin.role });
          return;
        }
        setMsg('Invalid code. Please try again.', false);
      } else {
        // Demo OTP: 000000
        if (code === '000000') {
          completeLogin({ token: `demo.${pendingLogin.role}.${Date.now()}`, username: pendingLogin.username, role: pendingLogin.role, isDemo:true });
        } else {
          setMsg('Invalid code. Try 000000 (demo).', false);
        }
      }
    } catch {
      setMsg('Network error. Please retry.', false);
    } finally {
      setLoading(false);
    }
  });

  otpBack?.addEventListener('click', () => {
    pendingLogin = null;
    hideOTP();
  });

  // =====================================================================================
  // Functions
  // =====================================================================================

  function readForm() {
    const username = (usernameEl?.value || '').trim();
    const password = (passwordEl?.value || '').trim();
    const role     = (roleEl?.value || 'resident').trim();
    return { username, password, role };
  }

  function validate({ username, password }) {
    let ok = true;
    if (!username) {
      markInvalid(usernameEl, 'Username is required');
      ok = false;
    } else {
      clearInvalid(usernameEl);
    }
    if (!password || password.length < 6) {
      markInvalid(passwordEl, 'Password must be at least 6 characters');
      ok = false;
    } else {
      clearInvalid(passwordEl);
    }
    if (!ok) setMsg('Please fix the highlighted fields.', false);
    return ok;
  }

  function markInvalid(el, msg) {
    if (!el) return;
    el.classList.add('is-invalid');
    el.setAttribute('aria-invalid', 'true');
    if (msgDiv) {
      msgDiv.textContent = msg;
      msgDiv.className = 'error';
    }
  }

  function clearInvalid(el) {
    if (!el) return;
    el.classList.remove('is-invalid');
    el.removeAttribute('aria-invalid');
  }

  function togglePassword(e) {
    e.preventDefault();
    if (!passwordEl) return;
    const visible = passwordEl.type === 'text';
    passwordEl.type = visible ? 'password' : 'text';
    showPwBtn?.setAttribute('aria-pressed', String(!visible));
    showPwBtn && (showPwBtn.textContent = visible ? 'Show' : 'Hide');
  }

  function capsDetector(e) {
    if (!capsWarn) return;
    const on = e.getModifierState && e.getModifierState('CapsLock');
    capsWarn.style.display = on ? 'inline' : 'none';
  }

  function prefill() {
    // Keep last attempted role/user
    const lastRole = localStorage.getItem('lastRole');
    const lastUser = localStorage.getItem('lastUser');

    if (roleEl && lastRole) roleEl.value = lastRole;
    if (usernameEl && lastUser) usernameEl.value = lastUser;

    const remembered = localStorage.getItem('rememberedUser');
    if (remembered) {
      try {
        const u = JSON.parse(remembered);
        if (usernameEl) usernameEl.value = u.username || usernameEl.value;
        if (roleEl && u.role) roleEl.value = u.role;
        if (rememberEl) rememberEl.checked = true;
      } catch {}
    }
  }

  function applyLockState() {
    const lockInfo = getLockInfo();
    if (!lockInfo.locked) return;
    lockUI(true);
    tickLock(lockInfo.until);
  }

  function isLocked() {
    const lockInfo = getLockInfo();
    if (!lockInfo.locked) return false;
    setMsg(`Too many attempts. Try again in ${lockInfo.remaining}s.`, false);
    return true;
  }

  function failAttempt(message) {
    setMsg(message, false);
    const key = 'loginFails';
    const count = (parseInt(localStorage.getItem(key) || '0', 10) || 0) + 1;
    localStorage.setItem(key, String(count));
    if (count >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCK_SECONDS * 1000;
      localStorage.setItem('loginLockedUntil', String(until));
      lockUI(true);
      tickLock(until);
    }
  }

  function getLockInfo() {
    const until = parseInt(localStorage.getItem('loginLockedUntil') || '0', 10);
    const now = Date.now();
    if (until && until > now) {
      return { locked: true, until, remaining: Math.ceil((until - now) / 1000) };
    }
    // cleanup expired lock
    if (until && until <= now) {
      localStorage.removeItem('loginLockedUntil');
      localStorage.setItem('loginFails', '0');
    }
    return { locked: false, until: 0, remaining: 0 };
  }

  function tickLock(until) {
    updateLockMsg();
    lockTimer = setInterval(() => {
      const remain = Math.ceil((until - Date.now()) / 1000);
      if (remain <= 0) {
        clearInterval(lockTimer);
        lockUI(false);
        clearMsg();
        localStorage.removeItem('loginLockedUntil');
        localStorage.setItem('loginFails', '0');
      } else {
        updateLockMsg(remain);
      }
    }, 500);
  }

  function updateLockMsg(remain) {
    if (!msgDiv) return;
    const lockInfo = getLockInfo();
    const seconds = remain ?? lockInfo.remaining;
    msgDiv.textContent = `Too many attempts. Try again in ${seconds}s.`;
    msgDiv.className = 'error';
  }

  function lockUI(locked) {
    [usernameEl, passwordEl, roleEl, rememberEl, showPwBtn, submitBtn].forEach(el => el && (el.disabled = locked));
  }

  function setLoading(loading) {
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.dataset.loading = loading ? '1' : '0';
      submitBtn.textContent = loading ? 'Signing in…' : 'Sign in';
    }
  }

  function showOTP() {
    if (!otpSection) return;
    form?.classList.add('hidden');
    otpSection.classList.remove('hidden');
    otpCodeEl?.focus();
    setMsg('A verification code was sent to your email/phone.', true);
  }

  function hideOTP() {
    otpSection?.classList.add('hidden');
    form?.classList.remove('hidden');
    clearMsg();
  }

  function completeLogin({ token, username, role, isDemo = false }) {
    // Persist auth
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    localStorage.setItem('role', role);
    localStorage.setItem('isDemo', isDemo ? 'true' : 'false');

    // Remember me / last attempt
    localStorage.setItem('lastRole', role);
    localStorage.setItem('lastUser', username);
    if (rememberEl?.checked) {
      localStorage.setItem('rememberedUser', JSON.stringify({ username, role }));
    } else {
      localStorage.removeItem('rememberedUser');
    }

    // Reset lock state
    localStorage.setItem('loginFails', '0');
    localStorage.removeItem('loginLockedUntil');

    toast('✅ Signed in');

    // Redirect: use Settings default if present; otherwise per role
    const defaultLanding = getDefaultLanding();
    const fallback = role === 'landlord' ? DEMO.landlord.redirect : DEMO.resident.redirect;
    const to = defaultLanding || fallback;

    setTimeout(() => (window.location.href = to), 300);
  }

  function getDefaultLanding() {
    try {
      const raw = localStorage.getItem('appSettings');
      if (!raw) return '';
      const s = JSON.parse(raw);
      return s?.general?.defaultLanding || '';
    } catch { return ''; }
  }

  function setMsg(text, ok) {
    if (!msgDiv) return;
    msgDiv.textContent = text;
    msgDiv.className = ok ? 'success' : 'error';
    msgDiv.setAttribute('role', 'alert');
    msgDiv.setAttribute('aria-live', ok ? 'polite' : 'assertive');
    msgDiv.focus?.();
  }

  function clearMsg() {
    if (!msgDiv) return;
    msgDiv.textContent = '';
    msgDiv.className = '';
  }

  async function fetchJSON(path, options = {}) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
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
    setTimeout(()=> el.classList.add('show'), 60);
    setTimeout(()=> el.remove(), 3000);
  }
})();
