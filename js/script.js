// js/script.js
(() => {
  // ===== Helpers =====
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const toggleHidden = (el, expandedEl) => {
    const isHidden = el.hasAttribute('hidden');
    if (isHidden) el.removeAttribute('hidden');
    else el.setAttribute('hidden', '');
    if (expandedEl) expandedEl.setAttribute(
      'aria-expanded', String(isHidden)
    );
  };

  // ===== SPA Navigation =====
  function showSection(sectionId) {
    qsa('.spa-section').forEach(sec => sec.classList.remove('active'));
    const target = qs(`#${sectionId}`);
    if (target) target.classList.add('active');
  }

  function enforceRoleAccess() {
    const hash = location.hash.slice(1) || 'home';
    if (hash === 'home' && window.currentUserRole !== 'landlord') {
      alert('Only landlords can access the dashboard.');
      location.hash = '#community';
      return false;
    }
    return true;
  }

  function handleHashChange() {
    if (!enforceRoleAccess()) return;
    const section = location.hash.slice(1) || 'home';
    showSection(section);
  }

  // ===== Dashboard Forms =====
  function initDashboardForms() {
    const cards = qsa('.dashboard-card');
    const forms = qsa('.task-form');
    cards.forEach(btn => {
      btn.addEventListener('click', () => {
        const form = qs(`#${btn.dataset.target}`);
        forms.forEach(f => f !== form && f.setAttribute('hidden', ''));
        toggleHidden(form);
        if (!form.hasAttribute('hidden')) form.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  function handleTaskSubmit(e) {
    e.preventDefault();
    const type = e.target.dataset.type;
    alert(`${type} request submitted!`);
    e.target.reset();
  }

  // ===== Community Arena =====
  function initCommunityArena() {
    const form = qs('#post-form');
    const list = qs('#post-list');
    const imageInput = qs('#post-image');
    const preview = qs('#image-preview');
    let posts = JSON.parse(localStorage.getItem('communityPosts')) || [];

    const saveAndRender = () => {
      localStorage.setItem('communityPosts', JSON.stringify(posts));
      renderPosts();
    };

    const renderPosts = () => {
      list.innerHTML = '';
      posts.slice().reverse().forEach((post, idx) => {
        const li = document.createElement('li');
        li.className = 'post';
        li.innerHTML = `
          <strong>${post.name}</strong>
          <span class="timestamp">${post.time}</span>
          <p>${post.message}</p>
          ${post.image ? `<img src="${post.image}" alt="User post image">` : ''}
          <button class="upvote-btn" data-index="${posts.length - 1 - idx}">
            👍 ${post.upvotes}
          </button>
        `;
        list.appendChild(li);
      });
    };

    imageInput?.addEventListener('change', () => {
      preview.innerHTML = '';
      const file = imageInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const img = document.createElement('img');
          img.src = reader.result;
          preview.appendChild(img);
        };
        reader.readAsDataURL(file);
      }
    });

    form?.addEventListener('submit', e => {
      e.preventDefault();
      const name = qs('#post-name').value.trim();
      const message = qs('#post-message').value.trim();
      if (!name || !message) {
        return alert('Please enter your name and message.');
      }
      const timestamp = new Date().toLocaleString();
      const file = imageInput.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        posts.push({
          name, message,
          time: timestamp,
          upvotes: 0,
          image: file ? reader.result : null
        });
        form.reset();
        preview.innerHTML = '';
        saveAndRender();
      };
      if (file) reader.readAsDataURL(file);
      else reader.onloadend();
    });

    list.addEventListener('click', e => {
      if (e.target.matches('.upvote-btn')) {
        const idx = Number(e.target.dataset.index);
        posts[idx].upvotes++;
        saveAndRender();
      }
    });

    renderPosts();
  }

  // ===== Textarea Auto-Resize =====
  function initTextareaAutoResize() {
    document.addEventListener('input', e => {
      if (e.target.tagName.toLowerCase() === 'textarea') {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
      }
    });
  }

  // ===== Dark Mode =====
  function initDarkModeToggle() {
    const toggle = qs('#darkToggle');
    if (!toggle) return;
    const saved = localStorage.getItem('darkMode') === 'true';
    toggle.checked = saved;
    document.body.classList.toggle('dark-mode', saved);
    toggle.addEventListener('change', () => {
      document.body.classList.toggle('dark-mode', toggle.checked);
      localStorage.setItem('darkMode', toggle.checked);
    });
  }

  // ===== Mobile Nav & Login Dropdown =====
  function initMobileNav() {
    const btn = qs('#hamburgerBtn');
    const nav = qs('#navLinks');
    btn?.addEventListener('click', () => toggleHidden(nav, btn));
  }

  function initLoginDropdown() {
    const btn = qs('#loginToggle');
    const menu = qs('#loginMenu');
    btn?.addEventListener('click', () => toggleHidden(menu, btn));
  }

  // ===== Initialization =====
  function init() {
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('load', handleHashChange);

    initMobileNav();
    initLoginDropdown();
    initDashboardForms();
    initCommunityArena();
    initTextareaAutoResize();
    initDarkModeToggle();

    // Attach generic form submit handler
    qsa('.task-form').forEach(form => {
      form.dataset.type = form.id.replace('-form', '');
      form.addEventListener('submit', handleTaskSubmit);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
