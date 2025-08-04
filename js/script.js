document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('mainHeader');
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');
  const loginToggle = document.getElementById('loginToggle');
  const loginMenu = document.getElementById('loginMenu');
  const loginForm = document.getElementById('loginForm');
  const logoutSection = document.getElementById('logoutSection');
  const logoutBtn = document.getElementById('logoutBtn');
  const darkToggle = document.getElementById('darkModeToggle');
  const darkIcon = document.getElementById('darkModeIcon');

  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > lastScroll && currentScroll > 80) {
      header?.classList.add('hide-nav');
    } else {
      header?.classList.remove('hide-nav');
    }
    lastScroll = currentScroll;
  });

  hamburgerBtn?.addEventListener('click', () => {
    navLinks?.classList.toggle('show');
    hamburgerBtn.setAttribute('aria-expanded', navLinks?.classList.contains('show'));
  });

  navLinks?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        navLinks.classList.remove('show');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
      }
    });
  });

  const enableDarkMode = () => {
    document.body.classList.add('dark');
    darkIcon.textContent = '🌙';
  };

  const disableDarkMode = () => {
    document.body.classList.remove('dark');
    darkIcon.textContent = '🌞';
  };

  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    enableDarkMode();
    darkToggle.checked = true;
  }

  darkToggle?.addEventListener('change', () => {
    const enabled = darkToggle.checked;
    enabled ? enableDarkMode() : disableDarkMode();
    localStorage.setItem('darkMode', enabled);
  });

  loginToggle?.addEventListener('click', (e) => {
    e.preventDefault();
    const expanded = loginToggle.getAttribute('aria-expanded') === 'true';
    loginToggle.setAttribute('aria-expanded', !expanded);
    loginMenu?.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (
      loginMenu &&
      !loginMenu.contains(e.target) &&
      !loginToggle.contains(e.target)
    ) {
      loginMenu.classList.add('hidden');
      loginToggle.setAttribute('aria-expanded', 'false');
    }
  });

  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const role = loginForm.loginRole.value;
    const name = loginForm.loginEmail.value.split('@')[0];
    toast(`🔐 Welcome ${name}! Logged in as ${role}`);
    loginMenu.classList.add('hidden');
    loginToggle.classList.add('hidden');
    logoutSection.classList.remove('hidden');
  });

  logoutBtn?.addEventListener('click', () => {
    toast("👋 You have been logged out.");
    loginToggle.classList.remove('hidden');
    logoutSection.classList.add('hidden');
  });

  const cleaningForm = document.getElementById('cleaningForm');
  cleaningForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!cleaningForm.checkValidity()) return;
    toast(`✅ Cleaning scheduled for ${cleaningForm.cleaningName.value} on ${cleaningForm.cleaningDate.value}`);
    cleaningForm.reset();
  });

  const repairForm = document.getElementById('repairForm');
  repairForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!repairForm.checkValidity()) return;
    toast(`🛠️ Repair issue submitted by ${repairForm.repairName.value}`);
    repairForm.reset();
  });

  const landlordForm = document.getElementById('landlordCleaningForm');
  landlordForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    toast("📅 Landlord cleaning scheduled successfully.");
    landlordForm.reset();
  });

  const postForm = document.getElementById('communityPostForm');
  const postList = document.getElementById('communityPosts');

  const savePost = (post) => {
    const existing = JSON.parse(localStorage.getItem('communityPosts') || '[]');
    existing.unshift(post);
    localStorage.setItem('communityPosts', JSON.stringify(existing.slice(0, 50)));
  };

  const renderPost = ({ name, msg, date }) => {
    const li = document.createElement('li');
    li.className = 'animated-card';
    li.innerHTML = `
      <strong>${name}</strong> <small>${date}</small>
      <p>${msg}</p>
      <div class="reactions">
        <button class="reaction">👍</button>
        <button class="reaction">❤️</button>
        <button class="reaction">😂</button>
      </div>
    `;
    postList.prepend(li);
  };

  const renderSavedPosts = () => {
    const saved = JSON.parse(localStorage.getItem('communityPosts') || '[]');
    saved.forEach(renderPost);
  };

  renderSavedPosts();

  postForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = postForm.posterName.value.trim();
    const msg = postForm.posterMessage.value.trim();
    const date = new Date().toLocaleString();
    if (!name || !msg) return;
    const post = { name, msg, date };
    renderPost(post);
    savePost(post);
    postForm.reset();
  });

  const toast = (msg) => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerText = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 100);
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  };
});
