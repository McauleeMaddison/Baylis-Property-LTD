document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const loginToggle = document.getElementById('loginToggle');
  const loginMenu = document.getElementById('loginMenu');
  const loginForm = document.getElementById('loginForm');

  const cleaningForm = document.getElementById('cleaningForm');
  const repairForm = document.getElementById('repairForm');
  const postForm = document.getElementById('communityPostForm');
  const postList = document.getElementById('communityPosts');

  const darkToggle = document.getElementById('darkModeToggle');
  const darkIcon = document.getElementById('darkModeIcon');

  const logoutBtn = document.getElementById('logoutBtn');
  const loginSection = document.getElementById('loginSection');
  const logoutSection = document.getElementById('logoutSection');

  // Hamburger Menu Toggle
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');

  if (hamburgerBtn && navLinks) {
    hamburgerBtn.addEventListener('click', () => {
      const expanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
      hamburgerBtn.setAttribute('aria-expanded', !expanded);
      navLinks.classList.toggle('show');
    });
  }

  // Login Dropdown Toggle
  if (loginToggle && loginMenu) {
    loginToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const expanded = loginToggle.getAttribute('aria-expanded') === 'true';
      loginToggle.setAttribute('aria-expanded', String(!expanded));
      loginMenu.classList.toggle('hidden');
      loginMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!loginMenu.contains(e.target) && !loginToggle.contains(e.target)) {
        loginMenu.classList.add('hidden');
        loginMenu.classList.remove('show');
        loginToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Cleaning Form Submit
  if (cleaningForm) {
    cleaningForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = cleaningForm.cleaningName?.value.trim();
      const date = cleaningForm.cleaningDate?.value;
      alert(`✅ Cleaning scheduled for ${name} on ${date}`);
      cleaningForm.reset();
    });
  }

  // Repair Form Submit
  if (repairForm) {
    repairForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const issue = repairForm.repairIssue?.value.trim();
      alert(`🛠️ Repair submitted:\n${issue}`);
      repairForm.reset();
    });
  }

  // Community Post Form Submit
  if (postForm && postList) {
    postForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = postForm.posterName?.value.trim();
      const message = postForm.posterMessage?.value.trim();
      if (!name || !message) return;

      const post = document.createElement('li');
      post.className = 'animated-card';
      post.innerHTML = `
        <strong>${name}</strong><br />
        <small>${new Date().toLocaleString()}</small>
        <p>${message}</p>
      `;
      postList.prepend(post);
      postForm.reset();
    });
  }

  // Dark Mode Init
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.body.classList.add('dark');
    darkToggle.checked = true;
    if (darkIcon) darkIcon.textContent = '🌙';
  }

  // Dark Mode Toggle
  darkToggle?.addEventListener('change', () => {
    const isDark = darkToggle.checked;
    document.body.classList.toggle('dark', isDark);
    localStorage.setItem('darkMode', isDark);
    if (darkIcon) darkIcon.textContent = isDark ? '🌙' : '☀️';
  });

  // Login State Simulation
  const handleLogin = (email, role) => {
    loginSection.classList.add('hidden');
    logoutSection.classList.remove('hidden');
    alert(`🔐 Logged in as ${role}: ${email}`);
  };

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginForm.loginEmail?.value.trim();
      const role = loginForm.loginRole?.value;
      handleLogin(email, role);
      loginMenu.classList.add('hidden');
      loginMenu.classList.remove('show');
      loginToggle.setAttribute('aria-expanded', 'false');
      loginForm.reset();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      loginSection.classList.remove('hidden');
      logoutSection.classList.add('hidden');
      alert('✅ You have been logged out.');
    });
  }
});
