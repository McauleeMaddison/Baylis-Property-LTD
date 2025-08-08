window.addEventListener('DOMContentLoaded', () => {
  const darkToggle = document.getElementById('darkModeToggle');
  const darkIcon = document.getElementById('darkModeIcon');
  const landlordLoginForm = document.getElementById('landlordLoginForm');
  const landlordDashboard = document.getElementById('landlordDashboard');
  const landlordGate = document.getElementById('landlordLoginGate');
  const logoutBtn = document.getElementById('logoutBtn');
  const header = document.getElementById('mainHeader');

  // === Toggle Dashboard Forms (Only one open at a time) ===
  document.querySelectorAll('.toggle-form-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      document.querySelectorAll('.form-wrapper').forEach(form => {
        if (form.id === targetId) {
          form.classList.toggle('hidden');
        } else {
          form.classList.add('hidden');
        }
      });
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
  const avatarBtn = document.getElementById('avatarBtn');
  const userDropdown = document.getElementById('userDropdown');
  avatarBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = avatarBtn.getAttribute('aria-expanded') === 'true';
    avatarBtn.setAttribute('aria-expanded', !expanded);
    userDropdown?.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!userDropdown?.contains(e.target) && !avatarBtn?.contains(e.target)) {
      userDropdown?.classList.add('hidden');
      avatarBtn?.setAttribute('aria-expanded', 'false');
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
  logoutBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('👋 Logged out successfully');
    setTimeout(() => window.location.reload(), 1200);
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
  const cleaningForm = document.querySelector('#cleaningForm form');
  cleaningForm?.addEventListener('submit', (e) => {
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
  const repairForm = document.querySelector('#repairForm form');
  repairForm?.addEventListener('submit', (e) => {
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
  const communityForm = document.querySelector('#communityPostForm form');
  communityForm?.addEventListener('submit', (e) => {
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
