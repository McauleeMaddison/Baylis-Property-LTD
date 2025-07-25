document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:5000/api';

  /** Utility: Fade Animations **/
  const fadeIn = (el, duration = 300) => {
    el.style.opacity = 0;
    el.style.display = 'block';
    el.style.transition = `opacity ${duration}ms ease-in-out`;
    requestAnimationFrame(() => el.style.opacity = 1);
    setTimeout(() => el.style.transition = '', duration);
  };

  const fadeOut = (el, duration = 300) => {
    el.style.transition = `opacity ${duration}ms ease-in-out`;
    el.style.opacity = 1;
    requestAnimationFrame(() => el.style.opacity = 0);
    setTimeout(() => {
      el.style.display = 'none';
      el.style.transition = '';
    }, duration);
  };

  /** Load Property Cards **/
  (async function loadProperties() {
    const container = document.getElementById('properties-container');
    if (!container) return;

    try {
      const res = await fetch(`${API}/properties`);
      const properties = await res.json();

      if (!Array.isArray(properties) || properties.length === 0) {
        container.innerHTML = '<p>No properties available.</p>';
        return;
      }

      container.innerHTML = properties.map(p => `
        <div class="property-card animated fade-up shadow">
          <h3>${p.name}</h3>
          <p>${p.location}</p>
        </div>
      `).join('');
    } catch (error) {
      console.error(error);
      container.innerHTML = '<p>Error loading properties.</p>';
    }
  })();

  /** Navigation Toggle **/
  const hamb = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');

  if (hamb && navLinks) {
    hamb.addEventListener('click', () => {
      const expanded = hamb.getAttribute('aria-expanded') === 'true';
      hamb.setAttribute('aria-expanded', !expanded);
      navLinks.classList.toggle('show');

      if (!expanded) {
        navLinks.querySelectorAll('li').forEach((li, i) => {
          li.style.opacity = 0;
          li.style.transition = 'opacity 300ms';
          setTimeout(() => (li.style.opacity = 1), i * 100);
        });
      }
    });
  }

  /** Login Dropdown **/
  const loginToggle = document.getElementById('loginToggle');
  const loginMenu = document.getElementById('loginMenu');

  if (loginToggle && loginMenu) {
    loginToggle.addEventListener('click', e => {
      e.stopPropagation();
      const expanded = loginToggle.getAttribute('aria-expanded') === 'true';
      loginToggle.setAttribute('aria-expanded', !expanded);
      loginMenu.classList.toggle('hidden');
      if (!expanded) fadeIn(loginMenu, 200);
    });

    document.addEventListener('click', e => {
      if (!loginToggle.contains(e.target) && !loginMenu.contains(e.target)) {
        loginMenu.classList.add('hidden');
        loginToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /** Dark Mode **/
  const darkToggle = document.getElementById('darkToggle');
  if (darkToggle) {
    const saved = localStorage.getItem('darkMode') === 'true';
    darkToggle.checked = saved;
    document.body.classList.toggle('dark', saved);

    darkToggle.addEventListener('change', () => {
      const isDark = darkToggle.checked;
      document.body.classList.toggle('dark', isDark);
      localStorage.setItem('darkMode', isDark);
      darkToggle.parentElement.classList.add('bumped');
      setTimeout(() => darkToggle.parentElement.classList.remove('bumped'), 300);
    });
  }

  /** Collapsible Panels **/
  document.querySelectorAll('.collapsible').forEach(panel => {
    const header = panel.querySelector('.collapsible-header');
    const body = panel.querySelector('.collapsible-body');
    if (header && body) {
      header.addEventListener('click', () => {
        const open = panel.classList.toggle('open');
        header.setAttribute('aria-expanded', open);
        body.style.maxHeight = open ? `${body.scrollHeight}px` : '0';
      });
    }
  });

  /** Modals **/
  const loginModal = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const closeBtns = document.querySelectorAll('.modal .close');
  const openLoginLinks = document.querySelectorAll('.openLogin');
  const showRegister = document.getElementById('showRegister');
  const logoutBtn = document.getElementById('logoutBtn');

  const openModal = modal => {
    modal.classList.remove('hidden');
    fadeIn(modal.querySelector('.modal-content'));
  };
  const closeModal = modal => {
    fadeOut(modal.querySelector('.modal-content'));
    setTimeout(() => modal.classList.add('hidden'), 300);
  };

  openLoginLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.getElementById('loginRole').value = link.dataset.role;
      openModal(loginModal);
    });
  });

  showRegister?.addEventListener('click', e => {
    e.preventDefault();
    closeModal(loginModal);
    openModal(registerModal);
  });

  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => closeModal(document.getElementById(btn.dataset.modal)));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      [loginModal, registerModal].forEach(m => !m.classList.contains('hidden') && closeModal(m));
    }
  });

  /** User Session Display **/
  async function updateNav() {
    try {
      const res = await fetch(`${API}/user`, { credentials: 'include' });
      const { user } = await res.json();
      loginToggle.textContent = user?.email ? `${user.email} ▼` : 'Login ▼';
    } catch {
      loginToggle.textContent = 'Login ▼';
    }
  }
  updateNav();

  /** Auth: Register **/
  registerForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = registerForm.registerEmail.value;
    const password = registerForm.registerPassword.value;
    const confirm = registerForm.registerConfirm.value;
    const role = registerForm.registerRole.value;
    if (password !== confirm) return alert('Passwords must match');
    const btn = registerForm.querySelector('button');
    btn.disabled = true;

    try {
      await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });

      await fetch(`${API}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });

      closeModal(registerModal);
      updateNav();
    } catch (err) {
      alert('Registration failed');
    } finally {
      btn.disabled = false;
    }
  });

  /** Auth: Login **/
  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = loginForm.loginEmail.value;
    const password = loginForm.loginPassword.value;
    const role = loginForm.loginRole.value;
    const btn = loginForm.querySelector('button');
    btn.disabled = true;

    try {
      await fetch(`${API}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      closeModal(loginModal);
      updateNav();
    } catch (err) {
      alert('Login failed');
    } finally {
      btn.disabled = false;
    }
  });

  /** Logout **/
  logoutBtn?.addEventListener('click', async () => {
    await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
    updateNav();
  });

  /** Forms: Repair / Cleaning / Message **/
  const formConfigs = [
    { id: 'repairForm', endpoint: 'repair', fields: ['repairName', 'repairAddress', 'repairIssue'], msg: 'Repair submitted!' },
    { id: 'cleaningForm', endpoint: 'cleaning', fields: ['cleaningName', 'cleaningAddress', 'cleaningDate'], msg: 'Cleaning scheduled!' },
    { id: 'messageForm', endpoint: 'message', fields: ['messageName', 'messageEmail', 'messageBody'], msg: 'Message sent!' }
  ];

  formConfigs.forEach(cfg => {
    const form = document.getElementById(cfg.id);
    if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button');
      btn.disabled = true;
      const body = {};
      cfg.fields.forEach(id => {
        const key = id.replace(/(Name|Address|Issue|Date|Email|Body)$/, '').toLowerCase();
        body[key] = document.getElementById(id).value;
      });

      try {
        const res = await fetch(`${API}/${cfg.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error();
        form.reset();
        alert(cfg.msg);
      } catch {
        btn.classList.add('jiggle');
        setTimeout(() => btn.classList.remove('jiggle'), 300);
        alert('Submission failed');
      } finally {
        btn.disabled = false;
      }
    });
  });

  /** Community Posts **/
  const postForm = document.getElementById('communityPostForm');
  const postList = document.getElementById('communityPosts');

  async function loadPosts() {
    if (!postList) return;
    try {
      const res = await fetch(`${API}/posts`);
      const posts = await res.json();
      postList.innerHTML = posts.length ? '' : '<li>No posts yet</li>';
      posts.forEach((p, i) => {
        const li = document.createElement('li');
        li.className = 'community-post';
        li.style.setProperty('--delay', `${i * 0.1}s`);
        const avatar = p.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(p.name)}`;
        li.innerHTML = `
          <div class="community-avatar" style="background-image:url('${avatar}')"></div>
          <div class="community-body">
            <strong>${p.name}</strong>
            <time datetime="${p.date}">${new Date(p.date).toLocaleString()}</time>
            <p>${p.message}</p>
          </div>`;
        postList.appendChild(li);
      });
    } catch {
      postList.innerHTML = '<li>Error loading posts.</li>';
    }
  }

  postForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('posterName').value.trim();
    const message = document.getElementById('posterMessage').value.trim();
    const btn = postForm.querySelector('button');
    btn.disabled = true;

    try {
      await fetch(`${API}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          message,
          avatar: `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`
        })
      });
      postForm.reset();
      await loadPosts();
    } catch {
      alert('Post failed');
    } finally {
      btn.disabled = false;
    }
  });

  loadPosts();
});
