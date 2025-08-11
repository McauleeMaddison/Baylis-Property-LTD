// js/register.js
window.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE || 'http://localhost:4000/api';

  const form       = document.getElementById('registerForm');
  const msg        = document.getElementById('registerMsg');
  const btn        = document.getElementById('registerBtn');

  const usernameEl = document.getElementById('regUsername');
  const roleEl     = document.getElementById('regRole');
  const pwEl       = document.getElementById('regPassword');
  const confirmEl  = document.getElementById('regConfirm');
  const acceptTos  = document.getElementById('acceptTos');

  const togglePw   = document.getElementById('togglePw');
  const pwBar      = document.getElementById('pwBar');
  const pwLabel    = document.getElementById('pwLabel');

  // ---- Show/Hide password
  togglePw?.addEventListener('click', () => {
    const hidden = pwEl.type === 'password';
    pwEl.type = hidden ? 'text' : 'password';
    togglePw.setAttribute('aria-pressed', String(hidden));
    togglePw.textContent = hidden ? '🙈' : '👁️';
  });

  // ---- Password strength meter
  pwEl?.addEventListener('input', () => {
    const score = scorePassword(pwEl.value);
    const { width, label, color } = meter(score);
    if (pwBar)   pwBar.style.width = width;
    if (pwBar)   pwBar.style.backgroundColor = color;
    if (pwLabel) pwLabel.textContent = `Strength: ${label}`;
  });

  // ---- Submit handler
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMsg();

    const username = (usernameEl?.value || '').trim();
    const role     = roleEl?.value || '';
    const password = pwEl?.value || '';
    const confirm  = confirmEl?.value || '';
    const agreed   = !!acceptTos?.checked;

    // Client-side validation
    if (!username || username.length < 3)  return setMsg('Username must be at least 3 characters.');
    if (!role)                              return setMsg('Please select a role.');
    if (!password || password.length < 6)   return setMsg('Password must be at least 6 characters.');
    if (password !== confirm)               return setMsg('Passwords do not match.');
    if (!agreed)                             return setMsg('Please accept the Terms & Privacy.');

    lock(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ username, password, role })
      });

      if (res.status === 201) {
        setMsg('✅ Account created! Redirecting to login…', true);
        // Small delay for UX, then go to login
        setTimeout(() => window.location.href = 'login.html', 900);
        return;
      }

      // Handle common errors
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

  // ---- Helpers
  function lock(on) {
    if (!btn) return;
    btn.disabled = on;
    btn.classList.toggle('is-loading', on);
  }
  function setMsg(text, success = false) {
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = success ? '#28a745' : '#e74c3c';
  }
  function clearMsg() {
    if (msg) { msg.textContent = ''; msg.style.color = ''; }
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
