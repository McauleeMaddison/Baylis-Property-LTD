// js/script.js
document.addEventListener('DOMContentLoaded', () => {
  // — Responsive nav
  const hamb = document.getElementById('hamburgerBtn'),
        navLinks = document.getElementById('navLinks');
  hamb.addEventListener('click', () => {
    const open = hamb.getAttribute('aria-expanded') === 'true';
    hamb.setAttribute('aria-expanded', String(!open));
    navLinks.classList.toggle('show');
  });

  // — Login dropdown
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

  // — Dark mode toggle
  const darkToggle = document.getElementById('darkToggle');
  darkToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark', darkToggle.checked);
    localStorage.setItem('darkMode', darkToggle.checked);
  });
  if (localStorage.getItem('darkMode')==='true') {
    darkToggle.checked = true;
    document.body.classList.add('dark');
  }

  // — Collapsible dashboard forms
  document.querySelectorAll('.collapsible').forEach(container => {
    const hdr = container.querySelector('.collapsible-header');
    hdr.addEventListener('click', () => {
      const isOpen = container.classList.toggle('open');
      hdr.setAttribute('aria-expanded', isOpen);
    });
  });

  // — AUTH: login & register via localStorage/sessionStorage
  let loginRole = null;
  const openLoginLinks = document.querySelectorAll('.openLogin'),
        loginModal      = document.getElementById('loginModal'),
        registerModal   = document.getElementById('registerModal'),
        loginForm       = document.getElementById('loginForm'),
        registerForm    = document.getElementById('registerForm');

  // Open login modal & set role
  openLoginLinks.forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      loginRole = a.dataset.role;
      document.getElementById('loginRole').value = loginRole;
      loginModal.classList.remove('hidden');
    });
  });

  // Switch to register
  document.getElementById('showRegister').addEventListener('click', e => {
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

  // Register handler
  registerForm.addEventListener('submit', e => {
    e.preventDefault();
    const email   = registerForm.registerEmail.value,
          pass    = registerForm.registerPassword.value,
          confirm = registerForm.registerConfirm.value,
          role    = registerForm.registerRole.value;
    if (pass !== confirm) return alert('Passwords do not match');
    let users = JSON.parse(localStorage.getItem('users')||'[]');
    if (users.find(u=>u.email===email)) return alert('Email already registered');
    users.push({ email, pass, role });
    localStorage.setItem('users', JSON.stringify(users));
    alert('Registered! Please log in.');
    registerModal.classList.add('hidden');
    loginModal.classList.remove('hidden');
  });

  // Login handler
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = loginForm.loginEmail.value,
          pass  = loginForm.loginPassword.value,
          role  = loginForm.loginRole.value;
    const users = JSON.parse(localStorage.getItem('users')||'[]'),
          user  = users.find(u=>u.email===email && u.pass===pass && u.role===role);
    if (!user) return alert('Invalid credentials');
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    alert(`Welcome, ${email}!`);
    loginModal.classList.add('hidden');
    updateNavForUser();
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', e => {
    e.preventDefault();
    sessionStorage.removeItem('currentUser');
    updateNavForUser();
  });

  // Update nav button text
  function updateNavForUser() {
    const btn = document.getElementById('loginToggle'),
          u   = JSON.parse(sessionStorage.getItem('currentUser')||'null');
    btn.textContent = u ? `${u.email} ▼` : 'Login ▼';
  }
  updateNavForUser();
});
