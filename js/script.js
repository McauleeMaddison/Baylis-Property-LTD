document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:5000/api'; // ← change to your live API URL

  /* ------------------------
     1) Load & Render Properties
  ------------------------ */
  (async function loadProperties() {
    const container = document.getElementById('properties-container');
    if (!container) return;
    try {
      const res = await fetch(`${API}/properties`);
      const properties = await res.json();
      if (!Array.isArray(properties) || properties.length === 0) {
        container.innerHTML = '<p>No properties available.</p>';
      } else {
        container.innerHTML = properties.map(p => `
          <div class="property-card">
            <h3>${p.name}</h3>
            <p>Location: ${p.location}</p>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error('Error loading properties:', err);
      container.innerHTML = '<p>Error loading properties.</p>';
    }
  })();

  /* ------------------------
     2) Responsive Nav & Login Dropdown
  ------------------------ */
  const hamb = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');
  if (hamb && navLinks) {
    hamb.addEventListener('click', () => {
      const open = hamb.getAttribute('aria-expanded') === 'true';
      hamb.setAttribute('aria-expanded', String(!open));
      navLinks.classList.toggle('show');
    });
  }

  const loginToggle = document.getElementById('loginToggle');
  const loginMenu   = document.getElementById('loginMenu');
  if (loginToggle && loginMenu) {
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
  }

  /* ------------------------
     3) Dark Mode Persistence
  ------------------------ */
  const darkToggle = document.getElementById('darkToggle');
  if (darkToggle) {
    const saved = localStorage.getItem('darkMode') === 'true';
    darkToggle.checked = saved;
    document.body.classList.toggle('dark', saved);

    darkToggle.addEventListener('change', () => {
      document.body.classList.toggle('dark', darkToggle.checked);
      localStorage.setItem('darkMode', darkToggle.checked);
    });
  }

  /* ------------------------
     4) Collapsible Panels
  ------------------------ */
  document.querySelectorAll('.collapsible').forEach(panel => {
    const hdr = panel.querySelector('.collapsible-header');
    if (!hdr) return;
    hdr.addEventListener('click', () => {
      const isOpen = panel.classList.toggle('open');
      hdr.setAttribute('aria-expanded', String(isOpen));
    });
  });

  /* ------------------------
     5) Auth Modals, Login/Logout, Nav Text
  ------------------------ */
  const openLoginLinks    = document.querySelectorAll('.openLogin');
  const loginModal        = document.getElementById('loginModal');
  const registerModal     = document.getElementById('registerModal');
  const loginForm         = document.getElementById('loginForm');
  const registerForm      = document.getElementById('registerForm');
  const logoutBtn         = document.getElementById('logoutBtn');
  const loginRoleInput    = document.getElementById('loginRole');
  const registerRoleInput = document.getElementById('registerRole');
  const showRegisterLink  = document.getElementById('showRegister');

  openLoginLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      loginRoleInput.value = link.dataset.role;
      loginModal?.classList.remove('hidden');
    });
  });

  showRegisterLink?.addEventListener('click', e => {
    e.preventDefault();
    loginModal?.classList.add('hidden');
    registerModal?.classList.remove('hidden');
  });

  document.querySelectorAll('.modal .close').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.modal;
      document.getElementById(id)?.classList.add('hidden');
    });
  });

  async function updateNav() {
    if (!loginToggle) return;
    try {
      const res = await fetch(`${API}/user`, { credentials: 'include' });
      if (!res.ok) throw new Error('not logged in');
      const { user } = await res.json();
      loginToggle.textContent = user?.email ? `${user.email} ▼` : 'Login ▼';
    } catch {
      loginToggle.textContent = 'Login ▼';
    }
  }
  updateNav();

  registerForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const email   = document.getElementById('registerEmail').value.trim();
    const pass    = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    const role    = registerRoleInput.value;
    if (pass !== confirm) {
      alert('Passwords do not match');
      return;
    }
    const btn = registerForm.querySelector('.btn');
    btn.disabled = true;
    try {
      // Register
      let res = await fetch(`${API}/register`, {
        method: 'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password: pass, role })
      });
      let json = await res.json();
      if (!res.ok) throw new Error(json.message);
      // Then login
      res = await fetch(`${API}/login`, {
        method:'POST', credentials:'include',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password: pass, role })
      });
      json = await res.json();
      if (!res.ok) throw new Error(json.message);
      alert('Registered & logged in!');
      registerForm.reset();
      registerModal?.classList.add('hidden');
      updateNav();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      btn.disabled = false;
    }
  });

  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value;
    const role  = loginRoleInput.value;
    const btn   = loginForm.querySelector('.btn');
    btn.disabled = true;
    try {
      const res = await fetch(`${API}/login`, {
        method:'POST', credentials:'include',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password: pass, role })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      alert(`Welcome, ${json.email}!`);
      loginForm.reset();
      loginModal?.classList.add('hidden');
      updateNav();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      btn.disabled = false;
    }
  });

  logoutBtn?.addEventListener('click', async e => {
    e.preventDefault();
    try {
      await fetch(`${API}/logout`, { method:'POST', credentials:'include' });
      updateNav();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  });

  /* ------------------------
     6) Task Forms Submission
  ------------------------ */
  const taskForms = [
    {
      formId:    'repairForm',
      endpoint:  'repair',
      getBody:   () => ({
        name:    document.getElementById('repairName').value,
        address: document.getElementById('repairAddress').value,
        issue:   document.getElementById('repairIssue').value
      }),
      successMsg: 'Repair request submitted!'
    },
    {
      formId:    'cleaningForm',
      endpoint:  'cleaning',
      getBody:   () => ({
        name:    document.getElementById('cleaningName').value,
        address: document.getElementById('cleaningAddress').value,
        date:    document.getElementById('cleaningDate').value
      }),
      successMsg: 'Cleaning scheduled!'
    },
    {
      formId:    'messageForm',
      endpoint:  'message',
      getBody:   () => ({
        name:    document.getElementById('messageName').value,
        email:   document.getElementById('messageEmail').value,
        body:    document.getElementById('messageBody').value
      }),
      successMsg: 'Message sent!'
    }
  ];

  taskForms.forEach(({ formId, endpoint, getBody, successMsg }) => {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const res = await fetch(`${API}/${endpoint}`, {
          method: 'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify(getBody())
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        alert(successMsg);
        form.reset();
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        btn.disabled = false;
      }
    });
  });

  /* ------------------------
     7) Dashboard cards → Open collapsible
  ------------------------ */
  document.querySelectorAll('.dashboard-card').forEach(card => {
    card.addEventListener('click', () => {
      const target = card.dataset.target;
      document.querySelectorAll('.collapsible').forEach(panel => {
        const hdr = panel.querySelector('.collapsible-header');
        if (panel.dataset.target === target) {
          panel.classList.add('open');
          hdr.setAttribute('aria-expanded','true');
          document.getElementById(target)?.scrollIntoView({ behavior:'smooth', block:'center' });
        } else {
          panel.classList.remove('open');
          hdr.setAttribute('aria-expanded','false');
        }
      });
    });
  });

  /* ------------------------
     8) Community: Load & Post
  ------------------------ */
  const postForm = document.getElementById('post-form');
  const postList = document.getElementById('post-list');

  async function loadPosts() {
    if (!postList) return;
    try {
      const res = await fetch(`${API}/posts`);
      const posts = await res.json();
      renderCommunityPosts(posts);
    } catch (err) {
      console.error('Failed to load posts:', err);
      postList.innerHTML = '<li>Error loading posts.</li>';
    }
  }

  function renderCommunityPosts(posts) {
    if (!postList) return;
    if (!Array.isArray(posts) || posts.length === 0) {
      postList.innerHTML = '<li>No posts yet—be the first!</li>';
      return;
    }
    postList.innerHTML = '';
    posts.forEach((post, i) => {
      const li = document.createElement('li');
      li.className = 'community-post';
      li.style.setProperty('--delay', `${i * 0.1}s`);
      const avatar = post.avatar
        || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(post.name)}`;
      li.innerHTML = `
        <div class="community-avatar" style="background-image:url('${avatar}')"></div>
        <div class="community-body">
          <div class="community-meta">
            <strong>${post.name}</strong>
            <time datetime="${post.date}">${new Date(post.date).toLocaleString()}</time>
          </div>
          <div class="community-message">${post.message}</div>
        </div>
      `;
      postList.appendChild(li);
    });
  }

  if (postForm && postList) {
    postForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name    = document.getElementById('post-name').value.trim();
      const message = document.getElementById('post-message').value.trim();
      if (!name || !message) return;
      const btn = postForm.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const avatar = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`;
        await fetch(`${API}/posts`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ name, message, avatar })
        });
        postForm.reset();
        await loadPosts();
      } catch (err) {
        alert('Error posting message');
        console.error(err);
      } finally {
        btn.disabled = false;
      }
    });
  }

  loadPosts();
});
