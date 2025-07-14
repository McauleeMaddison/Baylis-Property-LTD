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
  document.addEventListener('click', e => {
    if (!loginToggle.contains(e.target) && !loginMenu.contains(e.target)) {
      loginMenu.classList.add('hidden');
      loginToggle.setAttribute('aria-expanded', 'false');
    }
  });
  document.getElementById('logoutBtn').addEventListener('click', e => {
    e.preventDefault();
    alert('You have been logged out.');
  });

  // Dark mode
  const darkToggle = document.getElementById('darkToggle');
  darkToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark', darkToggle.checked);
    localStorage.setItem('darkMode', darkToggle.checked);
  });
  if (localStorage.getItem('darkMode') === 'true') {
    darkToggle.checked = true;
    document.body.classList.add('dark');
  }

  // Collapsible forms
  document.querySelectorAll('.collapsible').forEach(container => {
    const hdr = container.querySelector('.collapsible-header');
    hdr.addEventListener('click', () => {
      const isOpen = container.classList.toggle('open');
      hdr.setAttribute('aria-expanded', isOpen);
    });
  });
});
