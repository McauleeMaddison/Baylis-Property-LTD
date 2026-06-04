(function () {
  const body = document.body;
  if (!body) return;

  const setNavOpen = (open) => {
    const hamburgerBtn = document.querySelector('[data-hamb]');
    const navLinks = document.querySelector('[data-links]');
    if (!hamburgerBtn || !navLinks) return;
    navLinks.classList.toggle('show', !!open);
    navLinks.dataset.open = String(!!open);
    hamburgerBtn.setAttribute('aria-expanded', String(!!open));
    navLinks.style.maxHeight = open ? `${navLinks.scrollHeight}px` : '0px';
  };

  const toggleNav = () => setNavOpen(document.querySelector('[data-links]')?.dataset.open !== 'true');

  document.querySelector('[data-hamb]')?.addEventListener('click', (event) => {
    event.preventDefault();
    toggleNav();
  });

  const onResize = () => {
    const navLinks = document.querySelector('[data-links]');
    if (!navLinks) return;
    if (window.matchMedia('(min-width: 1025px)').matches) {
      navLinks.classList.remove('show');
      navLinks.dataset.open = 'false';
      navLinks.style.maxHeight = '';
      document.querySelector('[data-hamb]')?.setAttribute('aria-expanded', 'false');
    }
  };

  window.addEventListener('resize', onResize);
  onResize();

  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();
