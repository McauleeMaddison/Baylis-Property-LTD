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

  /** Sticky header hide on scroll down **/
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > lastScroll && currentScroll > 80) {
      header.classList.add('hide-nav');
    } else {
      header.classList.remove('hide-nav');
    }
    lastScroll = currentScroll;
  });

  /** Hamburger toggle for mobile **/
  hamburgerBtn?.addEventListener('click', () => {
    navLinks.classList.toggle('show');
    hamburgerBtn.setAttribute(
      'aria-expanded',
      navLinks.classList.contains('show')
    );
  });

  /** Dark Mode Toggle **/
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    darkToggle.checked = true;
  }

  darkToggle?.addEventListener('change', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', document.body.classList.contains('dark'));
  });

  /** Login Dropdown Behavior **/
  loginToggle?.addEventListener('click', (e) => {
    e.preventDefault();
    const expanded = loginToggle.getAttribute('aria-expanded') === 'true';
    loginToggle.setAttribute('aria-expanded', !expanded);
    loginMenu.classList.toggle('hidden');
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

  /** Login Submission **/
  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const role = loginForm.loginRole.value;
    const name = loginForm.loginEmail.value.split('@')[0];
    alert(`🔐 Welcome ${name}! Logged in as ${role}`);
    loginMenu.classList.add('hidden');
    loginToggle.classList.add('hidden');
    logoutSection.classList.remove('hidden');
  });

  /** Logout **/
  logoutBtn?.addEventListener('click', () => {
    alert("👋 You have been logged out.");
    loginToggle.classList.remove('hidden');
    logoutSection.classList.add('hidden');
  });

  /** Forms - Cleaning & Repair **/
  const cleaningForm = document.getElementById('cleaningForm');
  cleaningForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert(`✅ Cleaning scheduled for ${cleaningForm.cleaningName.value} on ${cleaningForm.cleaningDate.value}`);
    cleaningForm.reset();
  });

  const repairForm = document.getElementById('repairForm');
  repairForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert(`🛠️ Repair issue submitted by ${repairForm.repairName.value}`);
    repairForm.reset();
  });

  /** Community Post **/
  const postForm = document.getElementById('communityPostForm');
  const postList = document.getElementById('communityPosts');

  postForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = postForm.posterName.value.trim();
    const msg = postForm.posterMessage.value.trim();
    if (!name || !msg) return;

    const li = document.createElement('li');
    li.className = 'animated-card';
    li.innerHTML = `
      <strong>${name}</strong> <small>${new Date().toLocaleString()}</small>
      <p>${msg}</p>
      <div class="reactions">
        <button class="reaction">👍</button>
        <button class="reaction">❤️</button>
        <button class="reaction">😂</button>
      </div>
    `;
    postList.prepend(li);
    postForm.reset();
  });
});
