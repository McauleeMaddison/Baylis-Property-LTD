document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('mainHeader');
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');
  const loginToggle = document.getElementById('loginToggle');
  const loginMenu = document.getElementById('loginMenu');
  const loginForm = document.getElementById('loginForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutSection = document.getElementById('logoutSection');
  const loginSection = document.getElementById('loginSection');
  const landlordDashboard = document.getElementById('landlordDashboard');
  const residentDashboard = document.getElementById('dashboard');
  const darkModeToggle = document.getElementById('darkModeToggle');

  // ===== Navbar Collapse on Scroll =====
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > lastScroll && currentScroll > 60) {
      header.classList.add('hide-nav');
    } else {
      header.classList.remove('hide-nav');
    }
    lastScroll = currentScroll;
  });

  // ===== Mobile Menu Toggle =====
  hamburgerBtn?.addEventListener('click', () => {
    navLinks.classList.toggle('show');
    const expanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
    hamburgerBtn.setAttribute('aria-expanded', String(!expanded));
  });

  // ===== Login Dropdown Toggle =====
  loginToggle?.addEventListener('click', (e) => {
    e.preventDefault();
    const expanded = loginToggle.getAttribute('aria-expanded') === 'true';
    loginToggle.setAttribute('aria-expanded', String(!expanded));
    loginMenu.classList.toggle('hidden');
    loginMenu.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (
      loginMenu &&
      !loginMenu.contains(e.target) &&
      !loginToggle.contains(e.target)
    ) {
      loginMenu.classList.add('hidden');
      loginMenu.classList.remove('show');
      loginToggle.setAttribute('aria-expanded', 'false');
    }
  });

  // ===== Login Form =====
  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginForm.loginEmail.value;
    const role = loginForm.loginRole.value;

    alert(`✅ Logged in as ${email} (${role})`);

    loginMenu.classList.add('hidden');
    loginMenu.classList.remove('show');
    loginSection.classList.add('hidden');
    logoutSection.classList.remove('hidden');

    if (role === 'landlord') {
      landlordDashboard.classList.remove('hidden');
      residentDashboard.classList.add('hidden');
    } else {
      landlordDashboard.classList.add('hidden');
      residentDashboard.classList.remove('hidden');
    }

    loginForm.reset();
  });

  // ===== Logout =====
  logoutBtn?.addEventListener('click', () => {
    alert('👋 Logged out');
    loginSection.classList.remove('hidden');
    logoutSection.classList.add('hidden');
    landlordDashboard.classList.add('hidden');
    residentDashboard.classList.remove('hidden');
  });

  // ===== Cleaning Form =====
  const cleaningForm = document.getElementById('cleaningForm');
  cleaningForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = cleaningForm.cleaningName.value.trim();
    const date = cleaningForm.cleaningDate.value;
    const type = cleaningForm.cleaningType.value;

    alert(`🧼 Cleaning scheduled for ${name} on ${date} [${type}]`);
    cleaningForm.reset();
  });

  // ===== Repair Form =====
  const repairForm = document.getElementById('repairForm');
  repairForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = repairForm.repairName.value.trim();
    const issue = repairForm.repairIssue.value.trim();

    alert(`🔧 Repair request submitted by ${name}: ${issue}`);
    repairForm.reset();
  });

  // ===== Landlord Cleaning Form =====
  const landlordCleaningForm = document.getElementById('landlordCleaningForm');
  landlordCleaningForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = landlordCleaningForm.landlordCleaningName.value.trim();
    const date = landlordCleaningForm.landlordCleaningDate.value;
    const type = landlordCleaningForm.landlordCleaningType.value;

    alert(`🗓️ Cleaning scheduled for ${name} on ${date} (${type})`);
    landlordCleaningForm.reset();
  });

  // ===== Community Post Form =====
  const postForm = document.getElementById('communityPostForm');
  const postList = document.getElementById('communityPosts');

  postForm?.addEventListener('submit', (e) => {
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

  // ===== Dark Mode Toggle =====
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    darkModeToggle.checked = true;
  }

  darkModeToggle?.addEventListener('change', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', document.body.classList.contains('dark'));
  });
});
