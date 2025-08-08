window.addEventListener('DOMContentLoaded', () => {
  const darkToggle = document.getElementById('darkModeToggle');
  const darkIcon = document.getElementById('darkModeIcon');
  const landlordLoginForm = document.getElementById('landlordLoginForm');
  const landlordDashboard = document.getElementById('landlordDashboard');
  const landlordGate = document.getElementById('landlordLoginGate');
  const logoutBtn = document.getElementById('logoutBtn');
  const header = document.getElementById('mainHeader');

  // === Toggle Forms ===
  document.querySelectorAll('.toggle-form-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const form = document.getElementById(btn.dataset.target);
      form?.classList.toggle('hidden');
      form?.classList.add('animated');
    });
  });

  // === Dark Mode ===
  const updateDarkMode = (enabled) => {
    document.body.classList.toggle('dark', enabled);
    darkIcon.textContent = enabled ? '🌙' : '🌞';
    localStorage.setItem('darkMode', enabled);
  };

  const darkEnabled = localStorage.getItem('darkMode') === 'true';
  darkToggle.checked = darkEnabled;
  updateDarkMode(darkEnabled);

  darkToggle.addEventListener('change', () => {
    updateDarkMode(darkToggle.checked);
  });

  // === Avatar Dropdown ===
  const avatarToggle = document.querySelector('.avatar-toggle');
  const userDropdown = document.getElementById('userDropdown');

  avatarToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = avatarToggle.getAttribute('aria-expanded') === 'true';
    avatarToggle.setAttribute('aria-expanded', !expanded);
    userDropdown?.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!avatarToggle?.contains(e.target) && !userDropdown?.contains(e.target)) {
      userDropdown?.classList.add('hidden');
      avatarToggle?.setAttribute('aria-expanded', 'false');
    }
  });

  // === Auto-hide header on scroll (mobile UX improvement) ===
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    if (!header) return;
    if (window.scrollY > lastScrollY && window.scrollY > 60) {
      header.classList.add('hide-nav');
    } else {
      header.classList.remove('hide-nav');
    }
    lastScrollY = window.scrollY;
  });

  // === Landlord Login ===
  landlordLoginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('landlordUsername')?.value.trim();
    const password = document.getElementById('landlordPassword')?.value.trim();

    if (username === 'admin' && password === 'landlord123') {
      landlordDashboard?.classList.remove('hidden');
      landlordGate?.classList.add('hidden');
      showToast('🔓 Landlord portal unlocked!');
    } else {
      showToast('❌ Invalid credentials');
    }
  });

  // === Logout ===
  logoutBtn?.addEventListener('click', () => {
    showToast('👋 Logged out successfully');
    setTimeout(() => window.location.reload(), 1000);
  });

  // === Toasts ===
  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => toast.remove(), 3500);
  }

  // === Submission Helper ===
  const createSubmission = (text) => {
    const li = document.createElement('li');
    li.textContent = text;
    li.classList.add('animated');
    return li;
  };

  // === Cleaning Form ===
  document.getElementById('cleaningForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cleaningName')?.value;
    const date = document.getElementById('cleaningDate')?.value;
    const type = document.getElementById('cleaningType')?.value;
    const log = document.getElementById('cleaningSubmissions');

    if (name && date && type && log) {
      log.prepend(createSubmission(`🧼 ${name} requested a "${type}" clean on ${date}`));
      e.target.reset();
      showToast("✅ Cleaning request submitted");
    }
  });

  // === Repair Form ===
  document.getElementById('repairForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('repairName')?.value;
    const issue = document.getElementById('repairIssue')?.value;
    const log = document.getElementById('repairSubmissions');

    if (name && issue && log) {
      log.prepend(createSubmission(`🛠️ ${name} reported: ${issue}`));
      e.target.reset();
      showToast("✅ Repair request submitted");
    }
  });

  // === Community Post ===
  document.getElementById('communityPostForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('posterName')?.value;
    const msg = document.getElementById('posterMessage')?.value;
    const feed = document.getElementById('communityPosts');

    if (name && msg && feed) {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${name}</strong>: ${msg}`;
      li.classList.add('animated');
      feed.prepend(li);
      e.target.reset();
      showToast("💬 Post added to community");
    }
  });
});
