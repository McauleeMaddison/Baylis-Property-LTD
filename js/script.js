document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:5000/api'; // ← change to your live API URL

  /*----------------------------------------------------
    1) Utility: fadeIn on element with CSS class
  ----------------------------------------------------*/
  function fadeIn(el, duration = 400) {
    el.style.opacity = 0;
    el.style.display = '';
    el.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => el.style.opacity = 1);
    setTimeout(() => el.style.transition = '', duration);
  }
  function fadeOut(el, duration = 400) {
    el.style.opacity = 1;
    el.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => el.style.opacity = 0);
    setTimeout(() => {
      el.style.transition = '';
      el.style.display = 'none';
    }, duration);
  }

  /*----------------------------------------------------
    2) Load & Render Properties (with fadeIn)
  ----------------------------------------------------*/
  (async function loadProperties() {
    const container = document.getElementById('properties-container');
    if (!container) return;
    try {
      const res = await fetch(`${API}/properties`);
      const list = await res.json();
      if (!Array.isArray(list) || !list.length) {
        container.innerHTML = '<p>No properties available.</p>';
      } else {
        container.innerHTML = list.map(p => `
          <div class="property-card">
            <h3>${p.name}</h3>
            <p>Location: ${p.location}</p>
          </div>
        `).join('');
        // stagger fadeIn
        container.querySelectorAll('.property-card').forEach((card,i) => {
          card.style.opacity = 0;
          card.style.transition = 'opacity 600ms ease';
          setTimeout(() => { card.style.opacity = 1; }, i*100);
        });
      }
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p>Error loading properties.</p>';
    }
  })();

  /*----------------------------------------------------
    3) Responsive Nav & Dropdown
  ----------------------------------------------------*/
  const hamb = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');
  if (hamb && navLinks) {
    hamb.addEventListener('click', () => {
      const open = hamb.getAttribute('aria-expanded') === 'true';
      hamb.setAttribute('aria-expanded', String(!open));
      navLinks.classList.toggle('show');
      // animate links in
      if (!open) {
        navLinks.querySelectorAll('li').forEach((li, i) => {
          li.style.opacity = 0;
          li.style.transition = 'opacity 300ms ease';
          setTimeout(() => li.style.opacity = 1, i * 80);
        });
      }
    });
  }

  const loginToggle = document.getElementById('loginToggle');
  const loginMenu   = document.getElementById('loginMenu');
  if (loginToggle && loginMenu) {
    loginToggle.addEventListener('click', e => {
      e.stopPropagation();
      const open = loginToggle.getAttribute('aria-expanded') === 'true';
      loginToggle.setAttribute('aria-expanded', String(!open));
      loginMenu.classList.toggle('hidden');
      if (!open) fadeIn(loginMenu);
    });
    document.addEventListener('click', e => {
      if (!loginToggle.contains(e.target) && !loginMenu.contains(e.target)) {
        loginMenu.classList.add('hidden');
        loginToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /*----------------------------------------------------
    4) Dark Mode Persistence & Animate Icon
  ----------------------------------------------------*/
  const darkToggle = document.getElementById('darkToggle');
  if (darkToggle) {
    const saved = localStorage.getItem('darkMode') === 'true';
    darkToggle.checked = saved;
    document.body.classList.toggle('dark', saved);
    darkToggle.addEventListener('change', () => {
      document.body.classList.toggle('dark', darkToggle.checked);
      localStorage.setItem('darkMode', darkToggle.checked);
      // little toggle bounce
      darkToggle.parentElement.classList.add('bumped');
      setTimeout(() => darkToggle.parentElement.classList.remove('bumped'), 300);
    });
  }

  /*----------------------------------------------------
    5) Collapsible Sections (smooth height transition)
  ----------------------------------------------------*/
  document.querySelectorAll('.collapsible').forEach(panel => {
    const hdr = panel.querySelector('.collapsible-header');
    const body = panel.querySelector('.collapsible-body');
    if (!hdr || !body) return;
    hdr.addEventListener('click', () => {
      const isOpen = panel.classList.toggle('open');
      hdr.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        body.style.maxHeight = body.scrollHeight + 'px';
      } else {
        body.style.maxHeight = 0;
      }
    });
  });

  /*----------------------------------------------------
    6) Auth Modals, Escape key, Login/Logout, Nav Text
  ----------------------------------------------------*/
  const openLoginLinks    = document.querySelectorAll('.openLogin');
  const loginModal        = document.getElementById('loginModal');
  const registerModal     = document.getElementById('registerModal');
  const loginForm         = document.getElementById('loginForm');
  const registerForm      = document.getElementById('registerForm');
  const logoutBtn         = document.getElementById('logoutBtn');
  const loginRoleInput    = document.getElementById('loginRole');
  const registerRoleInput = document.getElementById('registerRole');
  const showRegisterLink  = document.getElementById('showRegister');

  function openModal(modal) {
    modal.classList.remove('hidden');
    fadeIn(modal.querySelector('.modal-content'));
  }
  function closeModal(modal) {
    fadeOut(modal.querySelector('.modal-content'));
    setTimeout(() => modal.classList.add('hidden'), 400);
  }

  openLoginLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      loginRoleInput.value = link.dataset.role;
      openModal(loginModal);
    });
  });
  showRegisterLink?.addEventListener('click', e => {
    e.preventDefault();
    closeModal(loginModal);
    openModal(registerModal);
  });
  document.querySelectorAll('.modal .close').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(document.getElementById(btn.dataset.modal));
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      [loginModal, registerModal].forEach(m => !m.classList.contains('hidden') && closeModal(m));
    }
  });

  async function updateNav() {
    if (!loginToggle) return;
    try {
      const res = await fetch(`${API}/user`, { credentials: 'include' });
      if (!res.ok) throw '';
      const { user } = await res.json();
      loginToggle.textContent = user?.email ? `${user.email} ▼` : 'Login ▼';
    } catch {
      loginToggle.textContent = 'Login ▼';
    }
  }
  updateNav();

  registerForm?.addEventListener('submit', async e => {
    e.preventDefault();
    /* same as before… */
    // after success:
    closeModal(registerModal);
    updateNav();
  });
  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    /* same as before… */
    closeModal(loginModal);
    updateNav();
  });
  logoutBtn?.addEventListener('click', async e => {
    e.preventDefault();
    await fetch(`${API}/logout`, { method:'POST', credentials:'include' });
    updateNav();
  });

  /*----------------------------------------------------
    7) Task Forms Submission (with button “jiggle” on error)
  ----------------------------------------------------*/
  const taskForms = [
    { formId:'repairForm',   endpoint:'repair',  fields:['repairName','repairAddress','repairIssue'], msg:'Repair sent!' },
    { formId:'cleaningForm', endpoint:'cleaning',fields:['cleaningName','cleaningAddress','cleaningDate'],msg:'Cleaning scheduled!' },
    { formId:'messageForm',  endpoint:'message', fields:['messageName','messageEmail','messageBody'],   msg:'Message sent!' }
  ];
  taskForms.forEach(({formId, endpoint, fields, msg}) => {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button');
      btn.disabled = true;
      const payload = fields.reduce((o, id) => (o[id]=document.getElementById(id).value, o), {});
      try {
        const res = await fetch(`${API}/${endpoint}`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error((await res.json()).message);
        alert(msg);
        form.reset();
      } catch (err) {
        // “jiggle” button on error
        btn.classList.add('jiggle');
        setTimeout(() => btn.classList.remove('jiggle'), 300);
        alert(`Error: ${err.message}`);
      } finally {
        btn.disabled = false;
      }
    });
  });

  /*----------------------------------------------------
    8) Dashboard → Open Collapsible
  ----------------------------------------------------*/
  document.querySelectorAll('.dashboard-card').forEach((card,i) => {
    card.style.setProperty('--i', i);
    card.addEventListener('click', () => {
      const target = card.dataset.target;
      document.querySelectorAll('.collapsible').forEach(panel => {
        const hdr = panel.querySelector('.collapsible-header');
        if (panel.dataset.target === target) {
          panel.classList.add('open');
          hdr.setAttribute('aria-expanded','true');
          panel.querySelector('.collapsible-body').style.maxHeight =
            panel.querySelector('.collapsible-body').scrollHeight + 'px';
        } else {
          panel.classList.remove('open');
          hdr.setAttribute('aria-expanded','false');
          panel.querySelector('.collapsible-body').style.maxHeight = 0;
        }
      });
    });
  });

  /*----------------------------------------------------
    9) Community: Load, Render & Scroll‑Reveal
  ----------------------------------------------------*/
  const postForm = document.getElementById('post-form');
  const postList = document.getElementById('post-list');
  async function loadPosts() {
    if (!postList) return;
    try {
      const res = await fetch(`${API}/posts`);
      const posts = await res.json();
      renderCommunityPosts(posts);
    } catch {
      postList.innerHTML = '<li>Error loading posts.</li>';
    }
  }
  function renderCommunityPosts(posts) {
    if (!postList) return;
    postList.innerHTML = posts.length
      ? ''
      : '<li>No posts yet—be first!</li>';
    posts.forEach((post,i) => {
      const li = document.createElement('li');
      li.className = 'community-post';
      li.style.setProperty('--delay', `${i*0.1}s`);
      li.innerHTML = `
        <div class="community-avatar" style="background-image:url('${
          post.avatar||`https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(post.name)}`
        }')"></div>
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
    // scroll‐reveal
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    postList.querySelectorAll('.community-post').forEach(li => observer.observe(li));
  }

  if (postForm && postList) {
    postForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('post-name').value.trim();
      const msg  = document.getElementById('post-message').value.trim();
      if (!name||!msg) return;
      const btn = postForm.querySelector('button');
      btn.disabled = true;
      try {
        await fetch(`${API}/posts`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            name, message: msg,
            avatar:`https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`
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
