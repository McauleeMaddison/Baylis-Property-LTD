// Toggle mobile nav
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navLinks = document.getElementById('navLinks');

hamburgerBtn.addEventListener('click', () => {
  const expanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
  hamburgerBtn.setAttribute('aria-expanded', !expanded);
  navLinks.classList.toggle('hidden');
});

// Dropdown login menu
const loginToggle = document.getElementById('loginToggle');
const loginMenu = document.getElementById('loginMenu');

loginToggle.addEventListener('click', () => {
  const expanded = loginToggle.getAttribute('aria-expanded') === 'true';
  loginToggle.setAttribute('aria-expanded', !expanded);
  loginMenu.classList.toggle('hidden');
});

// Dark mode toggle
const darkToggle = document.getElementById('darkToggle');

darkToggle.addEventListener('change', () => {
  document.body.classList.toggle('dark', darkToggle.checked);
});

// SPA navigation between sections
const cards = document.querySelectorAll('.dashboard-card');
const sections = document.querySelectorAll('.spa-section');

cards.forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.task-form').forEach(f => f.classList.add('hidden'));
    document.getElementById(card.dataset.target).classList.remove('hidden');
  });
});

function handleTaskSubmit(e, type) {
  e.preventDefault();
  alert(`${type} submitted!`);
  e.target.reset();
}

// Community post preview
const postForm = document.getElementById('post-form');
const postList = document.getElementById('post-list');
const postImage = document.getElementById('post-image');
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
  const name = document.getElementById('post-name').value;
  const message = document.getElementById('post-message').value;
  const li = document.createElement('li');
  li.innerHTML = `<strong>${name}:</strong> <p>${message}</p>`;
  if (postImage.files[0]) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(postImage.files[0]);
    li.appendChild(img);
  }
  postList.prepend(li);
  postForm.reset();
  imagePreview.innerHTML = '';
});

// Hide SPA sections not in use on load
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.spa-section:not(#home)').forEach(sec => sec.classList.add('hidden'));
});
