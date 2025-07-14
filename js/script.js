// Auto-hide header on scroll
let lastScroll = 0;
const header = document.querySelector('.site-header');
if (header) {
  // make sure you have in your CSS:
  // .site-header { position: fixed; top: 0; left: 0; width: 100%; transition: top 0.3s ease; }
  window.addEventListener('scroll', () => {
    const current = window.pageYOffset;
    if (current > lastScroll && current > 100) {
      header.style.top = '-80px';
    } else {
      header.style.top = '0';
    }
    lastScroll = current;
  });
}

// Mobile navigation toggle
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navLinks     = document.getElementById('navLinks');
if (hamburgerBtn && navLinks) {
  hamburgerBtn.addEventListener('click', () => {
    const expanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
    hamburgerBtn.setAttribute('aria-expanded', String(!expanded));
    navLinks.classList.toggle('visible');
  });
}

// Login dropdown menu toggle
const loginToggle = document.getElementById('loginToggle');  // fixed typo here
const loginMenu   = document.getElementById('loginMenu');
if (loginToggle && loginMenu) {
  loginToggle.addEventListener('click', () => {
    const expanded = loginToggle.getAttribute('aria-expanded') === 'true';
    loginToggle.setAttribute('aria-expanded', String(!expanded));
    loginMenu.classList.toggle('hidden');
  });
}

// Dark mode toggle
const darkToggle = document.getElementById('darkToggle');
if (darkToggle) {
  darkToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark', darkToggle.checked);
  });
}

// Collapsible form panels
document.querySelectorAll('.dashboard-card').forEach(card => {
  const target = document.getElementById(card.dataset.target);
  if (!target) return;
  card.addEventListener('click', () => {
    document.querySelectorAll('.task-form').forEach(form => {
      if (form !== target) form.classList.remove('active');
    });
    target.classList.toggle('active');
  });
});

// Task form submission handler
function handleTaskSubmit(e, type) {
  e.preventDefault();
  alert(`${type} submitted successfully.`);
  e.target.reset();
}

// Attach submit handlers to all .task-form elements
document.querySelectorAll('.task-form').forEach(form => {
  const type = form.dataset.type || 'Task';
  form.addEventListener('submit', e => handleTaskSubmit(e, type));
});

// Community post preview & submit
const postForm    = document.getElementById('post-form');
const postList    = document.getElementById('post-list');
const postImage   = document.getElementById('postImage');
const imagePreview = document.getElementById('image-preview');

// Preview selected image
if (postImage && imagePreview) {
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

// Handle post submission
if (postForm && postList) {
  postForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('postName').value.trim();
    const message = document.getElementById('postMessage').value.trim();
    if (!name || !message) return;
    const li = document.createElement('li');
    li.innerHTML = `<strong>${name}</strong><p>${message}</p>`;
    if (postImage && postImage.files[0]) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(postImage.files[0]);
      li.appendChild(img);
    }
    postList.prepend(li);
    postForm.reset();
    if (imagePreview) imagePreview.innerHTML = '';
  });
}

// Initialize SPA sections (hide all but #home)
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.spa-section:not(#home)').forEach(sec => {
    sec.classList.add('hidden');
  });
});

