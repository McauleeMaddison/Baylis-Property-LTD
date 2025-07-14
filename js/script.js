// Front-end interactivity & auth against back end
document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:5000/api';

  // Responsive nav
  const hamb = document.getElementById('hamburgerBtn'),
        navLinks = document.getElementById('navLinks');
  hamb.addEventListener('click', () => {
    const open = hamb.getAttribute('aria-expanded') === 'true';
    hamb.setAttribute('aria-expanded', String(!open));
    navLinks.classList.toggle('show');
  });

  // Login dropdown
  const loginToggle = document.getElementById('loginToggle'),
        loginMenu   = document.getElementById('loginMenu');
  loginToggle.addEventListener('click', () => {
    const open = loginToggle.getAttribute('aria-expanded') === 'true';
    loginToggle.setAttribute('aria-expanded', String(!open));
    loginMenu.classList.toggle('hidden');
  });
  document.addEventListener('click', e => {
    if (!loginToggle.contains(e.target) && !loginMenu.contains(e.target)) {
      loginMenu.classList.add('hidden');
      loginToggle.setAttribute('aria-expanded','false');
    }
  });

  // Dark mode
  const darkToggle = document.getElementById('darkToggle');
  darkToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark', darkToggle.checked);
    localStorage.setItem('darkMode', darkToggle.checked);
  });
  if (localStorage.getItem('darkMode') === 'true') {
    darkToggle.checked = true;
    document.body.classList.add('dark');
  }

  // Collapsible
  document.querySelectorAll('.collapsible').forEach(c => {
    const hdr = c.querySelector('.collapsible-header');
    hdr.addEventListener('click', () => {
      const isOpen = c.classList.toggle('open');
      hdr.setAttribute('aria-expanded', isOpen);
    });
  });

  // Auth modals & forms
  const openLoginLinks = document.querySelectorAll('.openLogin'),
        loginModal      = document.getElementById('loginModal'),
        registerModal   = document.getElementById('registerModal'),
        loginForm       = document.getElementById('loginForm'),
        registerForm    = document.getElementById('registerForm'),
        logoutBtn       = document.getElementById('logoutBtn'),
        loginRoleInput  = document.getElementById('loginRole'),
        registerRoleInput = document.getElementById('registerRole'),
        showRegister    = document.getElementById('showRegister');

  let loginRole = '';

  // Show login modal
  openLoginLinks.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      loginRole = a.dataset.role;
      loginRoleInput.value = loginRole;
      loginModal.classList.remove('hidden');
    });
  });

  // Switch to register
  showRegister.addEventListener('click', e => {
    e.preventDefault();
    loginModal.classList.add('hidden');
    registerModal.classList.remove('hidden');
  });

  // Close modals
  document.querySelectorAll('.modal .close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.modal).classList.add('hidden');
    });
  });

  // Update nav text based on session
  async function updateNavForUser() {
    const res = await fetch(`${API}/user`, { credentials: 'include' });
    const { user } = await res.json();
    loginToggle.textContent = user ? `${user.email} ▼` : 'Login ▼';
  }
  updateNavForUser();

  // Register
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email   = registerForm.registerEmail.value;
    const pass    = registerForm.registerPassword.value;
    const confirm = registerForm.registerConfirm.value;
    const role    = registerRoleInput.value;
    if (pass !== confirm) return alert('Passwords do not match');
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, role })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.message);
    alert('Registered! Please log in.');
    registerModal.classList.add('hidden');
    loginModal.classList.remove('hidden');
  });

  // Login
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass  = document.getElementById('loginPassword').value;
    const role  = loginRoleInput.value;
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, role })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.message);
    alert(`Welcome, ${data.email}!`);
    loginModal.classList.add('hidden');
    updateNavForUser();
  });

  // Logout
  logoutBtn.addEventListener('click', async e => {
    e.preventDefault();
    await fetch(`${API}/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    updateNavForUser();
  });
});
