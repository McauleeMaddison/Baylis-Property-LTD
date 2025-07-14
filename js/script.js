// Mobile navigation toggle
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navLinks = document.getElementById('navLinks');
hamburgerBtn.addEventListener('click', () => {
  const expanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
  hamburgerBtn.setAttribute('aria-expanded', String(!expanded));
  navLinks.classList.toggle('visible');
});

// Dropdown login menu
const loginToggle = document.getElementById('loginToggle');
const loginMenu = document.getElementById('loginMenu');
loginToggle.addEventListener('click', () => {
  const expanded = loginToggle.getAttribute('aria-expanded') === 'true';
  loginToggle.setAttribute('aria-expanded', String(!expanded));
  loginMenu.classList.toggle('hidden');
});

// Dark mode toggle
const darkToggle = document.getElementById('darkToggle');
darkToggle.addEventListener('change', () => {
  document.body.classList.toggle('dark', darkToggle.checked);
});

// SPA form navigation
const cards = document.querySelectorAll('.dashboard-card');
cards.forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.task-form').forEach(form => form.classList.add('hidden'));
    document.getElementById(card.dataset.target).classList.remove('hidden');
  });
});

function handleTaskSubmit(e, type) {
  e.preventDefault();
  alert(`${type} submitted successfully.`);
  e.target.reset();
}

// Community post preview & submission
const postForm = document.getElementById('post-form');
const postList = document.getElementById('post-list');
const postImage = document.getElementById('postImage');
const imagePreview = document.getElementById('image-preview');
postImage.addEventListener('change', () => {
  const file = postImage.files[0];
  imagePreview.innerHTML = '';
  if (file) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    imagePreview.appendChild(img);
  }
});

postForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('postName').value.trim();
  const message = document.getElementById('postMessage').value.trim();
  if (!name || !message) return;
  const li = document.createElement('li');
  li.innerHTML = `<strong>${name}</strong><p>${message}</p>`;
  if (postImage.files[0]) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(postImage.files[0]);
    li.appendChild(img);
  }
  postList.prepend(li);
  postForm.reset();
  imagePreview.innerHTML = '';
});

// Initialize SPA sections
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.spa-section:not(#home)').forEach(sec => sec.classList.add('hidden'));
});
