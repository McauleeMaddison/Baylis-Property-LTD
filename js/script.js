// js/script.js
document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:5000/api'; // ← your back-end base URL

  // 1) Responsive nav
  const hamb = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');
  hamb.addEventListener('click', () => {
    const open = hamb.getAttribute('aria-expanded') === 'true';
    hamb.setAttribute('aria-expanded', String(!open));
    navLinks.classList.toggle('show');
  });

  // 2) Login dropdown toggle
  const loginToggle = document.getElementById('loginToggle');
  const loginMenu   = document.getElementById('loginMenu');
  loginToggle.addEventListener('click', () => {
    const open = loginToggle.getAttribute('aria-expanded') === 'true';
    loginToggle.setAttribute('aria-expanded', String(!open));
    loginMenu.classList.toggle('hidden');
  });
  document.addEventListener('click', e => {
    if (
      !loginToggle.contains(e.target) &&
      !loginMenu.contains(e.target)
    ) {
      loginMenu.classList.add('hidden');
      loginToggle.setAttribute('aria-expanded', 'false');
    }
  });

  // 3) Dark mode persistence
  const darkToggle = document.getElementById('darkToggle');
  darkToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark', darkToggle.checked);
    localStorage.setItem('darkMode', darkToggle.checked);
  });
  if (localStorage.getItem('darkMode') === 'true') {
    darkToggle.checked = true;
    document.body.classList.add('dark');
  }

  // 4) Collapsibles
  document.querySelectorAll('.collapsible').forEach(container => {
    const hdr = container.querySelector('.collapsible-header');
    hdr.addEventListener('click', () => {
      const isOpen = container.classList.toggle('open');
      hdr.setAttribute('aria-expanded', isOpen);
    });
  });

  // 5) Auth modals & forms
  const openLoginLinks    = document.querySelectorAll('.openLogin');
  const loginModal        = document.getElementById('loginModal');
  const registerModal     = document.getElementById('registerModal');
  const loginForm         = document.getElementById('loginForm');
  const registerForm      = document.getElementById('registerForm');
  const logoutBtn         = document.getElementById('logoutBtn');
  const loginRoleInput    = document.getElementById('loginRole');
  const registerRoleInput = document.getElementById('registerRole');
  const showRegister      = document.getElementById('showRegister');

  // a) Open login modal with role
  openLoginLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      loginRoleInput.value = link.dataset.role;
      loginModal.classList.remove('hidden');
    });
  });

  // b) Switch to register
  showRegister.addEventListener('click', e => {
    e.preventDefault();
    loginModal.classList.add('hidden');
    registerModal.classList.remove('hidden');
  });

  // c) Close modals
  document.querySelectorAll('.modal .close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.modal).classList.add('hidden');
    });
  });

  // d) Update nav text
  async function updateNavForUser() {
    try {
      const res = await fetch(`${API}/user`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const { user } = await res.json();
      loginToggle.textContent = user
        ? `${user.email} ▼`
        : 'Login ▼';
    } catch (err) {
      console.error('Could not fetch /user:', err);
    }
  }
  updateNavForUser();

  // e) Register handler
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

  // f) Login handler
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

  // g) Logout handler
  logoutBtn.addEventListener('click', async e => {
    e.preventDefault();
    await fetch(`${API}/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    updateNavForUser();
  });
});
