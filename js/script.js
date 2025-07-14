// Auto-hide header on scroll
let lastScroll = 0;
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  const current = window.pageYOffset;
  if (current > lastScroll && current > 100) {
    header.style.top = '-80px';
  } else {
    header.style.top = '0';
  }
  lastScroll = current;
});

// Mobile navigation toggle
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navLinks = document.getElementById('navLinks');
hamburgerBtn.addEventListener('click', () => {
  const expanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
  hamburgerBtn.setAttribute('aria-expanded', String(!expanded));
  navLinks.classList.toggle('visible');
});

// Login dropdown menu toggle
tconst loginToggle = document.getElementById('loginToggle');
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

// Collapsible form panels
document.querySelectorAll('.dashboard-card').forEach(card => {
  const target = document.getElementById(card.dataset.target);
  card.addEventListener('click', () => {
    document.querySelectorAll('.task-form').forEach(form => {
      if (form !== target) form.classList.remove('active');
    });
    target.classList.toggle('active');
  });
});

// Task form submission
function handleTaskSubmit(e, type) {
  e.preventDefault();
  alert(`${type} submitted successfully.`);
  e.target.reset();
}

// Community post preview & submit
const postForm = document.getElementById('post-form');
const postList = document.getElementById('post-list');
const postImage = document.getElementById('postImage');
const imagePreview = document.getElementById('image-preview');

if (postImage) {
  postImage.addEventListener('change', () => {
    const file = postImage.files[0];
    imagePreview.innerHTML = '';
    if (file) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      imagePreview.appendChild(img);
    }
  });
}

if (postForm) {
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
}

// Initialize SPA sections
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.spa-section:not(#home)').forEach(sec => sec.classList.add('hidden'));
});
