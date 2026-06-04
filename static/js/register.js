window.addEventListener('DOMContentLoaded', () => {
  const API_BASE = (document.body?.getAttribute('data-api-base') || window.API_BASE || '/api');
  const getCsrfToken = () => {
    const match = document.cookie.match(/(?:^|;)\s*csrfToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };
  const ensureCsrf = async () => {
    if (getCsrfToken()) return;
    try {
      await fetch(`${API_BASE}/security/csrf`, { credentials: 'include' });
    } catch (err) {
      console.warn('CSRF prefetch failed', err);
    }
  };

  const form       = document.getElementById('registerForm');
  const msg        = document.getElementById('registerMsg');
  const btn        = document.getElementById('registerBtn');

  const usernameEl = document.getElementById('regUsername');
  const emailEl    = document.getElementById('regEmail');
  const roleEl     = document.getElementById('regRole');
  const pwEl       = document.getElementById('regPassword');
  const confirmEl  = document.getElementById('regConfirm');
  const acceptTos  = document.getElementById('acceptTos');

  const togglePw   = document.getElementById('togglePw');
  const pwBar      = document.getElementById('pwBar');
  const pwLabel    = document.getElementById('pwLabel');

  const bindToggle = (btn, inputs) => {
    if (!btn) return;
    const list = Array.isArray(inputs) ? inputs.filter(Boolean) : [inputs].filter(Boolean);
    if (!list.length) return;
    btn.addEventListener('click', () => {
      const hidden = list[0].type === 'password';
      list.forEach((field) => { field.type = hidden ? 'text' : 'password'; });
      btn.setAttribute('aria-pressed', String(hidden));
      btn.textContent = hidden ? 'Hide' : 'Show';
    });
  };

  bindToggle(togglePw, [pwEl, confirmEl]);

  pwEl?.addEventListener('input', () => {
    const score = scorePassword(pwEl.value);
    const { width, label, color } = meter(score);
    if (pwBar)   pwBar.style.width = width;
    if (pwBar)   pwBar.style.backgroundColor = color;
    if (pwLabel) pwLabel.textContent = `Strength: ${label}`;
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMsg();

    await ensureCsrf();

    const username = (usernameEl?.value || '').trim();
    const email    = (emailEl?.value || '').trim();
    const role     = roleEl?.value || '';
    const password = pwEl?.value || '';
    const confirmed   = confirmEl?.value || '';
    const agreed   = !!acceptTos?.checked;

    var bad = false;
    setInvalid(usernameEl, !username || username.length < 3);
    setInvalid(emailEl, !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    setInvalid(roleEl, !role);
    setInvalid(pwEl, !password || password.length < 8);
    setInvalid(confirmEl, password !== confirmed);

    if (!username || username.length < 3) bad = true;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad = true;
    if (!role) bad = true;
    if (!password || password.length < 8) bad = true;
    if (password !== confirmed) bad = true;
    if (!agreed) return setMsg('Please accept the Terms & Privacy.');
    if (bad) return setMsg('Please check the highlighted fields and try again.');

    lock(true);
    try {
      const headers = { 'Content-Type':'application/json' };
      const payload = { username, email, password, role };
      const fetcher = typeof window.fetchWithCsrf === 'function'
        ? window.fetchWithCsrf
        : (url, opts) => {
            const csrf = getCsrfToken();
            if (csrf) opts.headers['X-CSRF-Token'] = csrf;
            return fetch(url, opts);
          };
      const res = await fetcher(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (res.status === 201) {
        let data = {};
        try { data = await res.json(); } catch {}
        const destRole = (data?.user?.role || role).toLowerCase();
        const appConfig = window.BAYLIS_CONFIG || {};
        const redirects = appConfig.roleRedirects || {};
        const dest = redirects[destRole] || appConfig.defaultLanding || 'resident.html';
        setMsg('✅ Account created! Redirecting…', true);
        setTimeout(() => window.location.href = dest, 900);
        return;
      }

      let data = {};
      try { data = await res.json(); } catch {}
      if (res.status === 409) return setMsg('That username is already taken.');
      if (data?.error)        return setMsg(data.error);
      return setMsg('Could not register. Please try again.');
    } catch (err) {
      return setMsg('Network error. Is the API running?');
    } finally {
      lock(false);
    }
  });

  function lock(on) {
    if (!btn) return;
    btn.disabled = on;
    btn.dataset.loading = on ? '1' : '0';
  }
  function setMsg(text, success = false) {
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = success ? '#28a745' : '#e74c3c';
    msg.setAttribute('role','alert');
    msg.setAttribute('aria-live', success ? 'polite' : 'assertive');
    msg.focus?.();
  }
  function clearMsg() {
    if (msg) { msg.textContent = ''; msg.style.color = ''; }
  }
  function setInvalid(el, on) {
    if (!el) return;
    el.classList.toggle('is-invalid', !!on);
  }

  function scorePassword(pw) {
    let s = 0; if (!pw) return s;
    const letters = {};
    for (let i=0; i<pw.length; i++) letters[pw[i]] = (letters[pw[i]] || 0) + 1;
    for (const c in letters) s += 5.0 / letters[c];
    const variations = {
      digits: /\d/.test(pw),
      lower: /[a-z]/.test(pw),
      upper: /[A-Z]/.test(pw),
      nonWords: /\W/.test(pw),
      length: pw.length >= 10
    };
    let count = 0; for (const k in variations) count += variations[k] ? 1 : 0;
    s += (count - 1) * 10;
    return parseInt(s, 10);
  }
  function meter(score) {
    if (score > 80) return { width:'100%', label:'Strong',    color:'#28a745' };
    if (score > 60) return { width:'75%',  label:'Good',      color:'#4a90e2' };
    if (score > 40) return { width:'50%',  label:'Fair',      color:'#f0ad4e' };
    if (score > 20) return { width:'25%',  label:'Weak',      color:'#e67e22' };
    return              { width:'10%',  label:'Very weak', color:'#e74c3c' };
  }
});
