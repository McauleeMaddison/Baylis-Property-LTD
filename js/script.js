// script.js

window.addEventListener('DOMContentLoaded', () => {
  const darkToggle = document.getElementById('darkModeToggle');
  const darkIcon = document.getElementById('darkModeIcon');
  const landlordLoginForm = document.getElementById('landlordLoginForm');
  const landlordDashboard = document.getElementById('landlordDashboard');
  const landlordGate = document.getElementById('landlordLoginGate');
  const logoutBtn = document.getElementById('logoutBtn');

  // Toggle Forms
  document.querySelectorAll('.toggle-form-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const form = document.getElementById(btn.dataset.target);
      form.classList.toggle('hidden');
      form.classList.add('animated');
    });
  });

  // Dark mode toggle
  const updateDarkMode = (enabled) => {
    document.body.classList.toggle('dark', enabled);
    localStorage.setItem('darkMode', enabled);
    darkIcon.textContent = enabled ? '🌙' : '🌞';
  };

  if (localStorage.getItem('darkMode') === 'true') {
    darkToggle.checked = true;
    updateDarkMode(true);
  }

  darkToggle.addEventListener('change', () => {
    updateDarkMode(darkToggle.checked);
  });

  // Avatar dropdown
  const avatarToggle = document.querySelector('.avatar-toggle');
  const userDropdown = document.getElementById('userDropdown');
  avatarToggle?.addEventListener('click', () => {
    const expanded = avatarToggle.getAttribute('aria-expanded') === 'true';
    avatarToggle.setAttribute('aria-expanded', !expanded);
    userDropdown.classList.toggle('hidden');
  });

  // Hide dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!avatarToggle.contains(e.target) && !userDropdown.contains(e.target)) {
      userDropdown?.classList.add('hidden');
      avatarToggle?.setAttribute('aria-expanded', 'false');
    }
  });

  // Landlord login
  landlordLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('landlordUsername').value.trim();
    const password = document.getElementById('landlordPassword').value.trim();

    if (username === 'admin' && password === 'landlord123') {
      landlordDashboard.classList.remove('hidden');
      landlordGate.classList.add('hidden');
      showToast('🔓 Landlord portal unlocked!');
    } else {
      showToast('❌ Invalid credentials');
    }
  });

  // Logout button
  logoutBtn?.addEventListener('click', () => {
    showToast('👋 Logged out successfully');
    window.location.reload();
  });

  // Submission utilities
  const createSubmission = (text) => {
    const li = document.createElement('li');
    li.textContent = text;
    li.classList.add('animated');
    return li;
  };

  document.getElementById('cleaningForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cleaningName').value;
    const date = document.getElementById('cleaningDate').value;
    document.getElementById('cleaningSubmissions').prepend(createSubmission(`🧼 ${name} scheduled cleaning on ${date}`));
    e.target.reset();
  });

  document.getElementById('repairForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('repairName').value;
    const issue = document.getElementById('repairIssue').value;
    document.getElementById('repairSubmissions').prepend(createSubmission(`🛠️ ${name} reported: ${issue}`));
    e.target.reset();
  });

  // Community Post
  document.getElementById('communityPostForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('posterName').value;
    const msg = document.getElementById('posterMessage').value;
    const li = document.createElement('li');
    li.innerHTML = `<strong>${name}</strong>: ${msg}`;
    li.classList.add('animated');
    document.getElementById('communityPosts').prepend(li);
    e.target.reset();
  });

  // Toasts
  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => toast.remove(), 3500);
  }
});
