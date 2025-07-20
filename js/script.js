document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:5000/api'; // adjust to your live URL

  /* ------------------------------
     1) Fetch & Render Properties
  ------------------------------ */
  const propsContainer = document.getElementById('properties-container');
  async function loadProperties() {
    if (!propsContainer) return;
    try {
      const res = await fetch(`${API}/properties`);
      const properties = await res.json();
      if (!properties.length) {
        propsContainer.innerHTML = '<p>No properties available.</p>';
      } else {
        propsContainer.innerHTML = properties.map(p => `
          <div class="property-card">
            <h3>${p.name}</h3>
            <p>Location: ${p.location}</p>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error('Error loading properties:', err);
      propsContainer.innerHTML = '<p>Error loading properties.</p>';
    }
  }
  loadProperties();

  /* ------------------------------
     2) Responsive Nav & Dropdown
  ------------------------------ */
  const hamb = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');
  if (hamb && navLinks) {
    hamb.addEventListener('click', () => {
      const expanded = hamb.getAttribute('aria-expanded') === 'true';
      hamb.setAttribute('aria-expanded', String(!expanded));
      navLinks.classList.toggle('show');
    });
  }

  const loginToggle = document.getElementById('loginToggle');
  const loginMenu   = document.getElementById('loginMenu');
  if (loginToggle && loginMenu) {
    loginToggle.addEventListener('click', () => {
      const expanded = loginToggle.getAttribute('aria-expanded') === 'true';
      loginToggle.setAttribute('aria-expanded', String(!expanded));
      loginMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', e => {
      if (!loginToggle.contains(e.target) && !loginMenu.contains(e.target)) {
        loginMenu.classList.add('hidden');
        loginToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ------------------------------
     3) Dark Mode Persistence
  ------------------------------ */
  const darkToggle = document.getElementById('darkToggle');
  if (darkToggle) {
    // initialize
    const saved = localStorage.getItem('darkMode') === 'true';
    darkToggle.checked = saved;
    document.body.classList.toggle('dark', saved);

    darkToggle.addEventListener('change', () => {
      document.body.classList.toggle('dark', darkToggle.checked);
      localStorage.setItem('darkMode', darkToggle.checked);
    });
  }

  /* ------------------------------
     4) Collapsible Sections
  ------------------------------ */
  document.querySelectorAll('.collapsible').forEach(container => {
    const hdr = container.querySelector('.collapsible-header');
    if (!hdr) return;
    hdr.addEventListener('click', () => {
      const isOpen = container.classList.toggle('open');
      hdr.setAttribute('aria-expanded', isOpen);
    });
  });

  /* ------------------------------
     5) Auth Modals & Nav Update
  ------------------------------ */
  const openLoginLinks   = document.querySelectorAll('.openLogin');
  const loginModal       = document.getElementById('loginModal');
  const registerModal    = document.getElementById('registerModal');
  const loginForm        = document.getElementById('loginForm');
  const registerForm     = document.getElementById('registerForm');
  const logoutBtn        = document.getElementById('logoutBtn');
  const loginRoleInput   = document.getElementById('loginRole');
  const registerRoleInput= document.getElementById('registerRole');
  const showRegister     = document.getElementById('showRegister');

  // a) Open login modal
  openLoginLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      loginRoleInput.value = link.dataset.role;
      loginModal?.classList.remove('hidden');
    });
  });

  // b) Switch to register
  showRegister?.addEventListener('click', e => {
    e.preventDefault();
    loginModal?.classList.add('hidden');
    registerModal?.classList.remove('hidden');
  });

  // c) Close modals
  document.querySelectorAll('.modal .close').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.modal;
      document.getElementById(id)?.classList.add('hidden');
    });
  });

  // d) Update nav text based on logged‑in user
  async function updateNavForUser() {
    if (!loginToggle) return;
    try {
      const res = await fetch(`${API}/user`, { credentials: 'include' });
      if (!res.ok) throw new Error(res.status);
      const { user } = await res.json();
      loginToggle.textContent = user ? `${user.email} ▼` : 'Login ▼';
    } catch {
      loginToggle.textContent = 'Login ▼';
    }
  }
  updateNavForUser();

  // e) Register handler
  registerForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const email   = registerForm.registerEmail.value.trim();
    const pass    = registerForm.registerPassword.value;
    const confirm = registerForm.registerConfirm.value;
    const role    = registerRoleInput.value;
    if (pass !== confirm) return alert('Passwords do not match');
    const btn = registerForm.querySelector('.btn');
    btn.disabled = true;
    try {
      let res = await fetch(`${API}/register`, {
        method: 'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password: pass, role })
      });
      let data = await res.json();
      if (!res.ok) throw new Error(data.message);
      // auto‑login
      res = await fetch(`${API}/login`, {
        method: 'POST', credentials:'include',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password: pass, role })
      });
      data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert('Registered & logged in!');
      registerForm.reset();
      registerModal?.classList.add('hidden');
      updateNavForUser();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      btn.disabled = false;
    }
  });

  // f) Login handler
  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value;
    const role  = loginRoleInput.value;
    const btn   = loginForm.querySelector('.btn');
    btn.disabled = true;
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST', credentials:'include',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password: pass, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert(`Welcome, ${data.email}!`);
      loginForm.reset();
      loginModal?.classList.add('hidden');
      updateNavForUser();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      btn.disabled = false;
    }
  });

  // g) Logout handler
  logoutBtn?.addEventListener('click', async e => {
    e.preventDefault();
    try {
      await fetch(`${API}/logout`, {
        method:'POST', credentials:'include'
      });
      updateNavForUser();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  });

  /* ------------------------------
     6) Task Forms (Repair, Cleaning, Message)
  ------------------------------ */
  const formsConfig = [
    { id: 'repairForm',   endpoint: 'repair',  fields:['repairName','repairAddress','repairIssue'],   msg:'Repair request submitted!' },
    { id: 'cleaningForm', endpoint: 'cleaning', fields:['cleaningName','cleaningAddress','cleaningDate'], msg:'Cleaning scheduled!' },
    { id: 'messageForm',  endpoint: 'message',  fields:['messageName','messageEmail','messageBody'],     msg:'Message sent!' }
  ];
  formsConfig.forEach(cfg => {
    const form = document.getElementById(cfg.id);
    if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const payload = {};
      cfg.fields.forEach(f => { payload[f.replace(/(Name|Address|Issue|Date|Email|Body)$/,'').toLowerCase()] = document.getElementById(f).value; });
      try {
        const res = await fetch(`${API}/${cfg.endpoint}`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        alert(cfg.msg);
        form.reset();
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    });
  });

  /* ------------------------------
     7) Dashboard‑Card → Open Collapsible
  ------------------------------ */
  document.querySelectorAll('.dashboard-card').forEach(card => {
    card.addEventListener('click', () => {
      const target = card.dataset.target;
      document.querySelectorAll('.collapsible').forEach(c => {
        const hdr = c.querySelector('.collapsible-header');
        if (c.dataset.target === target) {
          c.classList.add('open');
          hdr.setAttribute('aria-expanded', 'true');
          document.getElementById(target)?.scrollIntoView({behavior:'smooth',block:'center'});
        } else {
          c.classList.remove('open');
          hdr.setAttribute('aria-expanded', 'false');
        }
      });
    });
  });

  /* ------------------------------
     8) Community Posts
  ------------------------------ */
  const postForm = document.getElementById('communityPostForm');
  const postList = document.getElementById('communityPosts');

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
    if (!posts.length) {
      postList.innerHTML = '<li>No posts yet—be the first!</li>';
      return;
    }
    postList.innerHTML = '';
    posts.forEach((post,i) => {
      const li = document.createElement('li');
      li.className = 'community-post';
      li.style.setProperty('--delay', `${i * 0.1}s`);
      const avatar = post.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(post.name)}`;
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

  if (postForm) {
    postForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name    = document.getElementById('posterName').value.trim();
      const message = document.getElementById('posterMessage').value.trim();
      if (!name || !message) return;
      postForm.querySelector('button').disabled = true;
      try {
        const avatar = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`;
        await fetch(`${API}/posts`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ name, message, avatar })
        });
        await loadPosts();
        postForm.reset();
      } catch (err) {
        alert('Error posting message');
        console.error(err);
      } finally {
        postForm.querySelector('button').disabled = false;
      }
    });
  }

  loadPosts();
});
