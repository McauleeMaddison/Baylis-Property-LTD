document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:5000/api'; // Your backend base URL

  // Fetch and display properties
  function renderProperties(properties) {
    const container = document.getElementById('properties-container');
    if (!container) return;
    if (!properties.length) {
      container.innerHTML = '<p>No properties available.</p>';
      return;
    }
    container.innerHTML = properties.map(p => `
      <div class="property-card">
        <h3>${p.name}</h3>
        <p>Location: ${p.location}</p>
      </div>
    `).join('');
  }

  fetch(`${API}/properties`)
    .then(res => res.json())
    .then(renderProperties)
    .catch(err => {
      document.getElementById('properties-container').innerHTML = '<p>Error loading properties.</p>';
      console.error(err);
    });

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
  const loginMenu = document.getElementById('loginMenu');
  loginToggle.addEventListener('click', () => {
    const open = loginToggle.getAttribute('aria-expanded') === 'true';
    loginToggle.setAttribute('aria-expanded', String(!open));
    loginMenu.classList.toggle('hidden');
  });
  
  document.addEventListener('click', e => {
    if (!loginToggle.contains(e.target) && !loginMenu.contains(e.target)) {
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
  const openLoginLinks = document.querySelectorAll('.openLogin');
  const loginModal = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginRoleInput = document.getElementById('loginRole');
  const registerRoleInput = document.getElementById('registerRole');
  const showRegister = document.getElementById('showRegister');

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
      const res = await fetch(`${API}/user`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const { user } = await res.json();
      loginToggle.textContent = user ? `${user.email} ▼` : 'Login ▼';
    } catch (err) {
      console.error('Error fetching user info:', err);
      loginToggle.textContent = 'Login ▼'; // Fallback
    }
  }
  updateNavForUser();

  // e) Register handler
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = registerForm.registerEmail.value;
    const pass = registerForm.registerPassword.value;
    const confirm = registerForm.registerConfirm.value;
    const role = registerRoleInput.value;
    if (pass !== confirm) {
      alert('Passwords do not match');
      return;
    }
    registerForm.querySelector('.btn').disabled = true;
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      // Auto-login after registration
      const loginRes = await fetch(`${API}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, role })
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.message);
      alert('Registered and logged in!');
      registerForm.reset();
      registerModal.classList.add('hidden');
      updateNavForUser();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      registerForm.querySelector('.btn').disabled = false;
    }
  });

  // f) Login handler
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    const role = loginRoleInput.value;
    loginForm.querySelector('.btn').disabled = true;
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert(`Welcome, ${data.email}!`);
      loginForm.reset();
      loginModal.classList.add('hidden');
      updateNavForUser();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      loginForm.querySelector('.btn').disabled = false;
    }
  });

  // g) Logout handler
  logoutBtn.addEventListener('click', async e => {
    e.preventDefault();

    try {
      await fetch(`${API}/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      updateNavForUser();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  });
  
  // 6) Form submissions
  // a) Repair form
  const repairForm = document.getElementById('repairForm');
  if (repairForm) {
    repairForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('repairName').value;
      const address = document.getElementById('repairAddress').value;
      const issue = document.getElementById('repairIssue').value;
      try {
        const res = await fetch(`${API}/repair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, address, issue })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        alert('Repair request submitted!');
        repairForm.reset();
      } catch (err) {
        alert('Error submitting repair: ' + err.message);
      }
    });
  }

  // b) Cleaning form
  const cleaningForm = document.getElementById('cleaningForm');
  if (cleaningForm) {
    cleaningForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('cleaningName').value;
      const address = document.getElementById('cleaningAddress').value;
      const date = document.getElementById('cleaningDate').value;
      try {
        const res = await fetch(`${API}/cleaning`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, address, date })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        alert('Cleaning scheduled!');
        cleaningForm.reset();
      } catch (err) {
        alert('Error scheduling cleaning: ' + err.message);
      }
    });
  }

  // c) Message form
  const messageForm = document.getElementById('messageForm');
  if (messageForm) {
    messageForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('messageName').value;
      const email = document.getElementById('messageEmail').value;
      const body = document.getElementById('messageBody').value;
      try {
        const res = await fetch(`${API}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, body })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        alert('Message sent!');
        messageForm.reset();
      } catch (err) {
        alert('Error sending message: ' + err.message);
      }
    });
  }

  // 7) Collapsible cards: open correct form when dashboard card clicked
  document.querySelectorAll('.dashboard-card').forEach(card => {
    card.addEventListener('click', () => {
      const target = card.getAttribute('data-target');
      document.querySelectorAll('.collapsible').forEach(c => {
        if (c.getAttribute('data-target') === target) {
          c.classList.add('open');
          c.querySelector('.collapsible-header').setAttribute('aria-expanded', true);
        } else {
          c.classList.remove('open');
          c.querySelector('.collapsible-header').setAttribute('aria-expanded', false);
        }
      });
      // Scroll to form
      const el = document.getElementById(target);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
});
