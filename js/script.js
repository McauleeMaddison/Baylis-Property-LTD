document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:5000/api';

  /** Utility animations **/
  const fadeIn = (el, duration = 300) => {
    el.style.opacity = 0;
    el.style.display = '';
    el.style.transition = `opacity ${duration}ms`;
    requestAnimationFrame(() => (el.style.opacity = 1));
    setTimeout(() => (el.style.transition = ''), duration);
  };

  const fadeOut = (el, duration = 300) => {
    el.style.opacity = 1;
    el.style.transition = `opacity ${duration}ms`;
    requestAnimationFrame(() => (el.style.opacity = 0));
    setTimeout(() => {
      el.style.display = 'none';
      el.style.transition = '';
    }, duration);
  };

  /** Load property cards **/
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
        <div class="property-card animated fade-up">
          <h3>${p.name}</h3>
          <p>${p.location}</p>
        </div>
      `).join('');

    } catch (error) {
      console.error(error);
      container.innerHTML = '<p>Error loading properties.</p>';
    }
  })();

  /** Navigation & dropdown menu **/
  const hamb = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');

  if (hamb && navLinks) {
    hamb.addEventListener('click', () => {
      const open = hamb.getAttribute('aria-expanded') === 'true';
      hamb.setAttribute('aria-expanded', !open);
      navLinks.classList.toggle('show');

      if (!open) {
        navLinks.querySelectorAll('li').forEach((li, i) => {
          li.style.opacity = 0;
          li.style.transition = 'opacity 300ms';
          setTimeout(() => (li.style.opacity = 1), i * 80);
        });
      }
    });
  }

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

  /** Dark mode toggle **/
  const darkToggle = document.getElementById('darkToggle');
  if (darkToggle) {
    const savedDark = localStorage.getItem('darkMode') === 'true';
    darkToggle.checked = savedDark;
    document.body.classList.toggle('dark', savedDark);

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
        const isOpen = panel.classList.toggle('open');
        header.setAttribute('aria-expanded', isOpen);
        body.style.maxHeight = isOpen ? `${body.scrollHeight}px` : '0';
      });
    }
  });

  /** Modal handlers **/
  const loginModal = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');
  const openLoginLinks = document.querySelectorAll('.openLogin');
  const showRegister = document.getElementById('showRegister');
  const closeBtns = document.querySelectorAll('.modal .close');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const logoutBtn = document.getElementById('logoutBtn');

  const openModal = modal => {
    modal.classList.remove('hidden');
    fadeIn(modal.querySelector('.modal-content'), 200);
  };
  const closeModal = modal => {
    fadeOut(modal.querySelector('.modal-content'), 200);
    setTimeout(() => modal.classList.add('hidden'), 200);
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
      [loginModal, registerModal].forEach(m => {
        if (!m.classList.contains('hidden')) closeModal(m);
      });
    }
  });

  /** Navigation state update **/
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

  /** Registration **/
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
      let r = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      let j = await r.json();
      if (!r.ok) throw j.message;

      // Auto-login
      r = await fetch(`${API}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      j = await r.json();
      if (!r.ok) throw j.message;

      closeModal(registerModal);
      updateNav();
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      btn.disabled = false;
    }
  });

  /** Login **/
  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = loginForm.loginEmail.value;
    const password = loginForm.loginPassword.value;
    const role = loginForm.loginRole.value;

    const btn = loginForm.querySelector('button');
    btn.disabled = true;

    try {
      const r = await fetch(`${API}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      const j = await r.json();
      if (!r.ok) throw j.message;

      closeModal(loginModal);
      updateNav();
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      btn.disabled = false;
    }
  });

  /** Logout **/
  logoutBtn?.addEventListener('click', async e => {
    e.preventDefault();
    await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
    updateNav();
  });

  /** Dashboard form submissions **/
  const formConfigs = [
    { id: 'repairForm', endpoint: 'repair', fields: ['repairName', 'repairAddress', 'repairIssue'], msg: 'Repair sent!' },
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
        const j = await res.json();
        if (!res.ok) throw j.message;

        alert(cfg.msg);
        form.reset();
      } catch (err) {
        btn.classList.add('jiggle');
        setTimeout(() => btn.classList.remove('jiggle'), 300);
        alert(`Error: ${err}`);
      } finally {
        btn.disabled = false;
      }
    });
  });

  /** Dashboard card expand toggle **/
  document.querySelectorAll('.dashboard-card').forEach((card, i) => {
    card.style.setProperty('--i', i);
    card.addEventListener('click', () => {
      const target = card.dataset.target;
      document.querySelectorAll('.collapsible').forEach(panel => {
        const isTarget = panel.dataset.target === target;
        panel.classList.toggle('open', isTarget);
        const header = panel.querySelector('.collapsible-header');
        const body = panel.querySelector('.collapsible-body');
        header?.setAttribute('aria-expanded', isTarget);
        body.style.maxHeight = isTarget ? `${body.scrollHeight}px` : '0';
      });
    });
  });

  /** Community board **/
  const postForm = document.getElementById('communityPostForm');
  const postList = document.getElementById('communityPosts');

  async function loadPosts() {
    if (!postList) return;

    try {
      const res = await fetch(`${API}/posts`);
      const posts = await res.json();

      postList.innerHTML = posts.length
        ? ''
        : '<li>No posts yet—be the first!</li>';

      posts.forEach((p, i) => {
        const li = document.createElement('li');
        li.className = 'community-post';
        li.style.setProperty('--delay', `${i * 0.1}s`);
        const avatar = p.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(p.name)}`;
        li.innerHTML = `
          <div class="community-avatar" style="background-image:url('${avatar}')"></div>
          <div class="community-body">
            <div class="community-meta">
              <strong>${p.name}</strong>
              <time datetime="${p.date}">${new Date(p.date).toLocaleString()}</time>
            </div>
            <div class="community-message">${p.message}</div>
          </div>
        `;
        postList.appendChild(li);
      });

      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      postList.querySelectorAll('.community-post').forEach(post => observer.observe(post));
    } catch {
      postList.innerHTML = '<li>Error loading posts.</li>';
    }
  }

  if (postForm) {
    postForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('posterName').value.trim();
      const message = document.getElementById('posterMessage').value.trim();
      if (!name || !message) return;

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
        alert('Error posting.');
      } finally {
        btn.disabled = false;
      }
    });
  }

  loadPosts();
});
