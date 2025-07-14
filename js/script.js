// js/script.js
document.addEventListener('DOMContentLoaded', () => {
  // Hamburger toggle
  const hamb = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');
  hamb.addEventListener('click', () => {
    const expanded = hamb.getAttribute('aria-expanded') === 'true';
    hamb.setAttribute('aria-expanded', String(!expanded));
    navLinks.classList.toggle('show');
  });

  // Login dropdown
  const loginToggle = document.getElementById('loginToggle');
  const loginMenu = document.getElementById('loginMenu');
  loginToggle.addEventListener('click', () => {
    const open = loginToggle.getAttribute('aria-expanded') === 'true';
    loginToggle.setAttribute('aria-expanded', String(!open));
    loginMenu.classList.toggle('hidden');
  });
  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (!loginToggle.contains(e.target) && !loginMenu.contains(e.target)) {
      loginMenu.classList.add('hidden');
      loginToggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', () => {
    alert('You have been logged out.');
    // add real logout logic here
  });

  // Dark mode
  const darkToggle = document.getElementById('darkToggle');
  darkToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark', darkToggle.checked);
    localStorage.setItem('darkMode', darkToggle.checked);
  });
  // Persist dark mode
  if (localStorage.getItem('darkMode') === 'true') {
    darkToggle.checked = true;
    document.body.classList.add('dark');
  }

  // Dashboard card → form switching
  const cards = document.querySelectorAll('.dashboard-card');
  const forms = document.querySelectorAll('.task-form');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const targetId = card.dataset.target;
      forms.forEach(f => f.id === targetId
        ? f.classList.remove('hidden')
        : f.classList.add('hidden'));
    });
  });

  // Optionally, show the first card's form on load:
  if (cards.length) cards[0].click();
});
