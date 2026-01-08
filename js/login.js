// js/login.js
(() => {
  'use strict';

  const API_BASE = (document.body?.getAttribute('data-api-base') || window.API_BASE || '/api');
  const MAX_ATTEMPTS = 5;
  const LOCK_SECONDS = 30;
  const getCsrfToken = () => {
    const match = document.cookie.match(/(?:^|;)\s*csrfToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const form        = $('#loginForm');
  const usernameEl  = $('#username');
  const passwordEl  = $('#password');
  const roleEl      = $('#roleSelect');
  const rememberEl  = $('#rememberMe');
  const showPwBtn   = $('#showPasswordBtn');
  const msgDiv      = $('#loginMsg');
  const submitBtn   = $('#submitBtn');
  const capsWarn    = $('#capsWarning');

  const otpSection  = $('#otpSection');
  const otpCodeEl   = $('#otpCode');
  const otpSubmit   = $('#otpSubmitBtn');
  const otpBack     = $('#otpBackBtn');
  const otpStatus   = $('#otpStatus');
  const otpCountdown= $('#otpCountdown');
  const otpResend   = $('#otpResendBtn');
  const forgotLink  = $('#forgotPassword');

  let pendingLogin = null;
  let lockTimer = null;
  let otpTimer = null;
  const OTP_RESEND_SECONDS = 30;
  let otpRemaining = OTP_RESEND_SECONDS;

  prefill();
  applyLockState();

  showPwBtn?.addEventListener('click', togglePassword);
  passwordEl?.addEventListener('keydown', capsDetector);
  passwordEl?.addEventListener('keyup', capsDetector);
  roleEl?.addEventListener('change', () => {
    if (!usernameEl) return;
    usernameEl.placeholder = roleEl.value === 'landlord'
      ? 'Landlord username'
      : 'Resident username';
  });

  forgotLink?.addEventListener('click', handleForgotPassword);
  form?.addEventListener('submit', handleLoginSubmit);
  otpSubmit?.addEventListener('click', handleOtpSubmit);
  otpResend?.addEventListener('click', handleOtpResend);
  otpBack?.addEventListener('click', () => {
    pendingLogin = null;
    hideOTP();
  });

  async function handleForgotPassword(e) {
    e.preventDefault();
    if (isLocked()) return;
    const emailOrUser = window.prompt('Enter the email or username for your account:');
    if (!emailOrUser) return;
    setMsg('Sending reset instructions…', true);
    try {
      const payload = /\S+@\S+\.\S+/.test(emailOrUser)
        ? { email: emailOrUser.trim() }
        : { username: emailOrUser.trim() };
      const res = await fetchJSON('/auth/request-reset', {
        method: 'POST',
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      if (!res?.ok) throw new Error('Reset request failed');
      toast('If the account exists, a reset code was sent via email/SMS.');
      const token = window.prompt('Enter the reset code you received (or leave blank to skip):');
      if (!token) return;
      const newPassword = window.prompt('Enter a new password (min 6 characters):');
      if (!newPassword || newPassword.length < 6) {
        toast('Password must be at least 6 characters.');
        return;
      }
      const confirmPw = window.prompt('Confirm the new password:');
      if (newPassword !== confirmPw) {
        toast('Passwords did not match.');
        return;
      }
      await submitPasswordReset(token.trim(), newPassword.trim());
    } catch (err) {
      console.error(err);
      setMsg('Unable to request a reset right now. Please try again later.', false);
    }
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    if (isLocked()) return;

    clearMsg();
    const { username, password, role } = readForm();
    if (!validate({ username, password })) return;

    setLoading(true);
    try {
      const res = await fetchJSON('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, role }),
        credentials: 'include'
      });
      if (res?.ok) {
        const data = await res.json();
        if (data.require2FA && data.challengeId) {
          pendingLogin = {
            username,
            role,
            challengeId: data.challengeId,
            delivery: data.delivery || 'email',
            context: data.context || 'login'
          };
          showOTP();
          startOtpCountdown();
          setLoading(false);
          return;
        }
        completeLogin({ token: data.token || 'session', username: data.user?.username || username, role: data.user?.role || role });
        return;
      }
      if (res?.status === 401) {
        failAttempt('Invalid credentials. Please try again.');
      } else {
        const data = await res?.json().catch(() => ({}));
        setMsg(data?.error || 'Unable to sign in right now.', false);
      }
    } catch (err) {
      setMsg('Unable to reach the server. Please check your connection.', false);
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit() {
    if (!pendingLogin) return hideOTP();
    const code = (otpCodeEl?.value || '').trim();
    if (!code || code.length < 6) return setMsg('Enter the 6-digit verification code.', false);
    setLoading(true);
    try {
      const res = await fetchJSON('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ challengeId: pendingLogin.challengeId, code }),
        credentials: 'include'
      });
      if (res?.ok) {
        const data = await res.json();
        const context = { ...pendingLogin };
        pendingLogin = null;
        hideOTP();
        completeLogin({
          token: data.token || 'session',
          username: data.user?.username || context.username,
          role: data.user?.role || context.role
        });
        return;
      }
      const data = await res?.json().catch(() => ({}));
      setMsg(data?.error || 'Invalid code. Please try again.', false);
    } catch {
      setMsg('Unable to verify the code. Please try again.', false);
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpResend() {
    if (!pendingLogin?.challengeId || otpResend?.disabled) return;
    otpResend.disabled = true;
    setMsg('Sending you a new code…', true);
    try {
      const res = await fetchJSON('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ challengeId: pendingLogin.challengeId }),
        credentials: 'include'
      });
      const data = await res?.json().catch(() => ({}));
      if (!res?.ok) throw new Error(data?.error || 'Unable to resend code.');
      pendingLogin.challengeId = data.challengeId;
      pendingLogin.delivery = data.delivery || pendingLogin.delivery;
      pendingLogin.context = data.context || pendingLogin.context;
      updateOtpStatus();
      startOtpCountdown();
      setMsg('New code sent. Check your device.', true);
    } catch (err) {
      console.error(err);
      otpResend.disabled = false;
      setMsg(err.message || 'Unable to resend the code. Please try again.', false);
    }
  }

  function readForm() {
    const username = (usernameEl?.value || '').trim();
    const password = (passwordEl?.value || '').trim();
    const role = (roleEl?.value || 'resident').trim();
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
    if (showPwBtn) showPwBtn.textContent = visible ? 'Show' : 'Hide';
  }

  function capsDetector(e) {
    if (!capsWarn) return;
    const on = e.getModifierState && e.getModifierState('CapsLock');
    capsWarn.style.display = on ? 'inline' : 'none';
  }

  function prefill() {
    const lastRole = localStorage.getItem('lastRole');
    const lastUser = localStorage.getItem('lastUser');
    if (roleEl && lastRole) roleEl.value = lastRole;
    if (usernameEl && lastUser) usernameEl.value = lastUser;

    const remembered = localStorage.getItem('rememberedUser');
    if (remembered) {
      try {
        const saved = JSON.parse(remembered);
        if (usernameEl) usernameEl.value = saved.username || usernameEl.value;
        if (roleEl && saved.role) roleEl.value = saved.role;
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
    [usernameEl, passwordEl, roleEl, rememberEl, showPwBtn, submitBtn].forEach((el) => {
      if (el) el.disabled = locked;
    });
  }

  function setLoading(loading) {
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.dataset.loading = loading ? '1' : '0';
      submitBtn.textContent = loading ? 'Signing in…' : 'Sign in';
    }
  }

  function showOTP() {
    form?.classList.add('hidden');
    otpSection?.classList.remove('hidden');
    otpCodeEl?.focus();
    updateOtpStatus();
    setMsg('A verification code was sent to your email/phone.', true);
  }

  function hideOTP() {
    otpSection?.classList.add('hidden');
    form?.classList.remove('hidden');
    otpCodeEl && (otpCodeEl.value = '');
    clearInterval(otpTimer);
    otpTimer = null;
    if (otpCountdown) otpCountdown.textContent = '';
    if (otpResend) otpResend.disabled = false;
    clearMsg();
  }

  function updateOtpStatus() {
    if (!otpStatus) return;
    if (!pendingLogin) {
      otpStatus.textContent = 'Enter the 6-digit code sent to your email/phone.';
      return;
    }
    const channel = pendingLogin.delivery === 'sms' ? 'text message' : 'email';
    otpStatus.textContent = `Enter the 6-digit code we sent via ${channel}.`;
  }

  function startOtpCountdown(seconds = OTP_RESEND_SECONDS) {
    clearInterval(otpTimer);
    otpRemaining = seconds;
    if (otpResend) otpResend.disabled = true;
    updateOtpCountdown();
    otpTimer = setInterval(() => {
      otpRemaining -= 1;
      updateOtpCountdown();
      if (otpRemaining <= 0) {
        clearInterval(otpTimer);
        otpTimer = null;
        if (otpResend) otpResend.disabled = false;
      }
    }, 1000);
  }

  function updateOtpCountdown() {
    if (!otpCountdown) return;
    if (otpRemaining <= 0) {
      otpCountdown.textContent = 'You can resend a new code now.';
    } else {
      otpCountdown.textContent = `Resend available in ${otpRemaining}s.`;
    }
  }

  function completeLogin({ token, username, role }) {
    localStorage.setItem('token', token || 'session');
    localStorage.setItem('username', username);
    localStorage.setItem('role', role);
    localStorage.setItem('lastRole', role);
    localStorage.setItem('lastUser', username);

    if (rememberEl?.checked) {
      localStorage.setItem('rememberedUser', JSON.stringify({ username, role }));
    } else {
      localStorage.removeItem('rememberedUser');
    }

    localStorage.setItem('loginFails', '0');
    localStorage.removeItem('loginLockedUntil');

    toast('✅ Signed in');

    const defaultLanding = getDefaultLanding();
    const fallback = role === 'landlord' ? 'landlord.html' : 'resident.html';
    const to = defaultLanding || fallback;
    setTimeout(() => { window.location.href = to; }, 300);
  }

  function getDefaultLanding() {
    try {
      const raw = localStorage.getItem('appSettings');
      if (!raw) return '';
      const settings = JSON.parse(raw);
      return settings?.general?.defaultLanding || '';
    } catch {
      return '';
    }
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
    msgDiv.removeAttribute('role');
    msgDiv.removeAttribute('aria-live');
  }

  async function submitPasswordReset(token, password) {
    try {
      const res = await fetchJSON('/auth/reset', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
        credentials: 'include'
      });
      if (res?.ok) {
        toast('✅ Password reset! Please sign in with your new password.');
        return true;
      }
      const data = await res?.json().catch(() => ({}));
      setMsg(data?.error || 'Could not reset password. Please check the code and try again.', false);
    } catch {
      setMsg('Unable to reset the password right now. Please try again.', false);
    }
    return false;
  }

  async function fetchJSON(path, options = {}) {
    try {
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      const opts = { ...options, headers, credentials: options.credentials || 'include' };
      if (typeof window.fetchWithCsrf === 'function') {
        return window.fetchWithCsrf(`${API_BASE}${path}`, { apiBase: API_BASE, ...opts });
      }
      const csrf = getCsrfToken();
      if (csrf) headers['X-CSRF-Token'] = csrf;
      return fetch(`${API_BASE}${path}`, opts);
    } catch {
      return null;
    }
  }

  function toast(text) {
    if (typeof window.showToast === 'function') {
      window.showToast(text);
      return;
    }
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 60);
    setTimeout(() => el.remove(), 3200);
  }
})();
