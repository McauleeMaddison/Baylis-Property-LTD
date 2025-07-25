document.addEventListener('DOMContentLoaded', () => {
  const fadeIn = (el, duration = 300) => {
    el.style.opacity = 0;
    el.style.display = '';
    el.style.transition = `opacity ${duration}ms`;
    requestAnimationFrame(() => (el.style.opacity = 1));
    setTimeout(() => (el.style.transition = ''), duration);
  };

  const fadeOut = (el, duration = 300) => {
    el.style.opacity = 1;
    el.style.transition = `opacity ${duration}ms`;
    requestAnimationFrame(() => (el.style.opacity = 0));
    setTimeout(() => {
      el.style.display = 'none';
      el.style.transition = '';
    }, duration);
  };

  const loginToggle = document.getElementById('loginToggle');
  const loginModal = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');
  const showRegister = document.getElementById('showRegister');

  loginToggle?.addEventListener('click', e => {
    e.preventDefault();
    loginModal.classList.remove('hidden');
    fadeIn(loginModal.querySelector('.modal-content'));
  });

  document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById(btn.dataset.modal);
      fadeOut(modal.querySelector('.modal-content'));
      setTimeout(() => modal.classList.add('hidden'), 200);
    });
  });

  showRegister?.addEventListener('click', e => {
    e.preventDefault();
    loginModal.classList.add('hidden');
    registerModal.classList.remove('hidden');
    fadeIn(registerModal.querySelector('.modal-content'));
  });

  const postForm = document.getElementById('communityPostForm');
  const postList = document.getElementById('communityPosts');

  postForm?.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('posterName').value;
    const message = document.getElementById('posterMessage').value;
    const li = document.createElement('li');
    li.innerHTML = `<strong>${name}</strong>: ${message}`;
    postList.appendChild(li);
    postForm.reset();
  });

  ['repairForm', 'cleaningForm'].forEach(id => {
    const form = document.getElementById(id);
    form?.addEventListener('submit', e => {
      e.preventDefault();
      alert(`${id === 'repairForm' ? 'Repair' : 'Cleaning'} submitted successfully!`);
      form.reset();
    });
  });
});
// Navbar Login Dropdown Toggle
const loginToggle = document.getElementById('loginToggle');
const loginMenu = document.getElementById('loginMenu');

if (loginToggle && loginMenu) {
  loginToggle.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    const expanded = loginToggle.getAttribute('aria-expanded') === 'true';
    loginToggle.setAttribute('aria-expanded', !expanded);
    loginMenu.classList.toggle('show');
    loginMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', e => {
    if (!loginMenu.contains(e.target) && !loginToggle.contains(e.target)) {
      loginMenu.classList.remove('show');
      loginMenu.classList.add('hidden');
      loginToggle.setAttribute('aria-expanded', 'false');
    }
  });
}
