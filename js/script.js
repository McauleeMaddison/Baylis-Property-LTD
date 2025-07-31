document.addEventListener('DOMContentLoaded', () => {
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

  // Cleaning Form
  if (cleaningForm) {
    cleaningForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = cleaningForm.cleaningName.value.trim();
      const date = cleaningForm.cleaningDate.value;
      alert(`✅ Cleaning scheduled for ${name} on ${date}`);
      cleaningForm.reset();
    });
  }

  // Repair Form
  if (repairForm) {
    repairForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const issue = repairForm.repairIssue.value.trim();
      alert(`🛠️ Repair submitted:\n${issue}`);
      repairForm.reset();
    });
  }

  // Login Form
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginForm.loginEmail.value.trim();
      const role = loginForm.loginRole.value;
      alert(`🔐 Logging in as ${role}: ${email}`);
      loginMenu.classList.add('hidden');
      loginMenu.classList.remove('show');
      loginToggle.setAttribute('aria-expanded', 'false');
      loginForm.reset();
    });
  }

  // Community Posts
  if (postForm && postList) {
    postForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = postForm.posterName.value.trim();
      const message = postForm.posterMessage.value.trim();
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

  // Dark Mode Toggle
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.body.classList.add('dark');
    darkToggle.checked = true;
    if (darkIcon) darkIcon.textContent = '🌙';
  }

  darkToggle?.addEventListener('change', () => {
    const isDark = darkToggle.checked;
    document.body.classList.toggle('dark', isDark);
    localStorage.setItem('darkMode', isDark);
    if (darkIcon) darkIcon.textContent = isDark ? '🌙' : '☀️';
  });
});

  // Navbar & Login dropdown
  const loginToggle = document.getElementById('loginToggle');
  const loginMenu = document.getElementById('loginMenu');
  const loginForm = document.getElementById('loginForm');

  // Forms
  const cleaningForm = document.getElementById('cleaningForm');
  const repairForm = document.getElementById('repairForm');
  const postForm = document.getElementById('communityPostForm');
  const postList = document.getElementById('communityPosts');

  /* LOGIN DROPDOWN TOGGLE */
  if (loginToggle && loginMenu) {
    loginToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const expanded = loginToggle.getAttribute('aria-expanded') === 'true';
      loginToggle.setAttribute('aria-expanded', String(!expanded));
      loginMenu.classList.toggle('hidden');
      loginMenu.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!loginMenu.contains(e.target) && !loginToggle.contains(e.target)) {
        loginMenu.classList.add('hidden');
        loginMenu.classList.remove('show');
        loginToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* CLEANING FORM SUBMIT */
  if (cleaningForm) {
    cleaningForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = cleaningForm.cleaningName.value.trim();
      const date = cleaningForm.cleaningDate.value;
      alert(`✅ Cleaning scheduled for ${name} on ${date}`);
      cleaningForm.reset();
    });
  }

  /* REPAIR FORM SUBMIT */
  if (repairForm) {
    repairForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const issue = repairForm.repairIssue.value.trim();
      alert(`🛠️ Repair submitted:\n${issue}`);
      repairForm.reset();
    });
  }

  /* LOGIN FORM SUBMIT */
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginForm.loginEmail.value.trim();
      const role = loginForm.loginRole.value;
      alert(`🔐 Logging in as ${role}: ${email}`);
      loginMenu.classList.add('hidden');
      loginMenu.classList.remove('show');
      loginToggle.setAttribute('aria-expanded', 'false');
      loginForm.reset();
    });
  }

  /* COMMUNITY POST SUBMIT */
  if (postForm && postList) {
    postForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = postForm.posterName.value.trim();
      const message = postForm.posterMessage.value.trim();
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
});
// Dark Mode Toggle
const darkToggle = document.getElementById('darkModeToggle');
const isDarkMode = localStorage.getItem('darkMode') === 'true';

// Apply saved theme
if (isDarkMode) {
  document.body.classList.add('dark');
  darkToggle.checked = true;
}

darkToggle?.addEventListener('change', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', document.body.classList.contains('dark'));
});
