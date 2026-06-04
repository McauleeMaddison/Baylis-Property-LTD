document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach((link) => {
    if (link.href === window.location.href) {
      link.classList.add('active');
    }
  });

  const passwordToggles = document.querySelectorAll('#showPasswordBtn, #togglePw');
  passwordToggles.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const form = button.closest('form');
      if (!form) return;
      const passInput = form.querySelector('input[type="password"]');
      if (!passInput) return;
      const show = passInput.type === 'password';
      passInput.type = show ? 'text' : 'password';
      button.textContent = show ? 'Hide' : 'Show';
      button.setAttribute('aria-pressed', String(show));
    });
  });
});
