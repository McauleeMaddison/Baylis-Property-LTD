document.addEventListener('DOMContentLoaded', () => {
  // Navbar Collapsible
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navLinks = document.querySelector('.nav-links');

  if (hamburgerBtn && navLinks) {
    hamburgerBtn.addEventListener('click', () => {
      const expanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
      hamburgerBtn.setAttribute('aria-expanded', !expanded);
      navLinks.classList.toggle('show');
    });
  }

  // Collapsible Forms
  const collapsibles = document.querySelectorAll('.collapsible-toggle');

  collapsibles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const content = toggle.nextElementSibling;
      toggle.classList.toggle('active');
      content.classList.toggle('show');
    });
  });

  // Login Dropdown
  const loginToggle = document.getElementById('loginToggle');
  const loginMenu = document.getElementById('loginMenu');
  const loginForm = document.getElementById('loginForm');

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

  // Forms: Cleaning
  const cleaningForm = document.getElementById('cleaningForm');
  if (cleaningForm) {
    cleaningForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = cleaningForm.cleaningName?.value.trim();
      const date = cleaningForm.cleaningDate?.value;
      const type = cleaningForm.cleaningType?.value;
      alert(`✅ Cleaning scheduled for ${name} on ${date} as ${type}`);
      cleaningForm.reset();
    });
  }

  // Forms: Repair
  const repairForm = document.getElementById('repairForm');
  if (repairForm) {
    repairForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = repairForm.repairName?.value.trim();
      const issue = repairForm.repairIssue?.value.trim();
      alert(`🛠️ Repair submitted by ${name}:\n${issue}`);
      repairForm.reset();
    });
  }

  // Forms: Community
  const postForm = document.getElementById('communityPostForm');
  const postList = document.getElementById('communityPosts');

  if (postForm && postList) {
    postForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = postForm.posterName.value.trim();
      const message = postForm.posterMessage.value.trim();
      if (!name || !message) return;

      const post = document.createElement('li');
      post.className = 'animated-card';
      post.innerHTML = `
        <div class="post-header">
          <strong>${name}</strong>
          <small>${new Date().toLocaleString()}</small>
        </div>
        <p>${message}</p>
        <div class="reactions">
          <button class="reaction">👍</button>
          <button class="reaction">❤️</button>
          <button class="reaction">😂</button>
        </div>
      `;
      postList.prepend(post);
      postForm.reset();
    });
  }

  // Dark Mode Toggle
  const darkToggle = document.getElementById('darkModeToggle');
  const isDarkMode = localStorage.getItem('darkMode') === 'true';

  if (isDarkMode) {
    document.body.classList.add('dark');
    darkToggle.checked = true;
  }

  darkToggle?.addEventListener('change', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', document.body.classList.contains('dark'));
  });
});
