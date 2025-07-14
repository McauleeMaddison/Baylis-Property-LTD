// ==========================
// SPA Section Switching
// ==========================
function showSection(sectionId) {
  document.querySelectorAll(".spa-section").forEach((section) => {
    section.classList.remove("active");
  });
  const target = document.getElementById(sectionId);
  if (target) target.classList.add("active");
}

function handleHashChange() {
  const hash = location.hash.replace("#", "") || "home";
  if (hash === "home" && window.currentUserRole !== "landlord") {
    alert("Only landlords can access the dashboard.");
    location.hash = "#community";
    return;
  }
  showSection(hash);
}

window.addEventListener("hashchange", handleHashChange);
window.addEventListener("load", handleHashChange);

// ==========================
// DOM Ready
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initLoginDropdown();
  initDashboardForms();
  initCommunityArena();
  initTextareaAutoResize();
  initDarkModeToggle();
});

document.addEventListener('DOMContentLoaded', () => {
  // Collapse/expand dashboard forms
  const cards = document.querySelectorAll('.dashboard-card');
  const forms = document.querySelectorAll('.task-form');

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const targetId = card.dataset.target;
      forms.forEach(form => {
        if (form.id === targetId) {
          // Toggle the clicked one
          form.classList.toggle('hidden');
        } else {
          // Always hide all others
          form.classList.add('hidden');
        }
      });
    });
  });

  // Hamburger menu toggle
  const hamburger = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  // Login dropdown
  const loginToggle = document.getElementById('loginToggle');
  const loginMenu = document.getElementById('loginMenu');
  loginToggle.addEventListener('click', () => {
    loginMenu.classList.toggle('hidden');
  });

  // Dark mode toggle
  const darkToggle = document.getElementById('darkToggle');
  darkToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', darkToggle.checked);
  });
});


// ==========================
// Form Display Toggle
// ==========================
function openForm(formId) {
  const allForms = document.querySelectorAll(".task-form");
  const targetForm = document.getElementById(formId);
  if (!targetForm) return;

  const alreadyVisible = !targetForm.classList.contains("hidden");
  allForms.forEach((form) => form.classList.add("hidden"));
  if (!alreadyVisible) {
    targetForm.classList.remove("hidden");
    targetForm.scrollIntoView({ behavior: "smooth" });
  }
}

function handleTaskSubmit(e, type) {
  e.preventDefault();
  alert(`${type} request submitted!`);
  e.target.reset();
}

// ==========================
// Auto Resize Textareas
// ==========================
function initTextareaAutoResize() {
  document.addEventListener("input", (e) => {
    if (e.target.tagName.toLowerCase() === "textarea") {
      e.target.style.height = "auto";
      e.target.style.height = `${e.target.scrollHeight}px`;
    }
  });
}

// ==========================
// Community Arena Logic
// ==========================
function initCommunityArena() {
  const postForm = document.getElementById("post-form");
  const postList = document.getElementById("post-list");
  const imageInput = document.getElementById("post-image");
  const preview = document.getElementById("image-preview");

  let posts = JSON.parse(localStorage.getItem("communityPosts")) || [];

  const renderPosts = () => {
    postList.innerHTML = "";
    posts.slice().reverse().forEach((post, index) => {
      const li = document.createElement("li");
      li.className = "post";
      li.innerHTML = `
        <strong>${post.name}</strong>
        <span class="timestamp">${post.time}</span>
        <p>${post.message}</p>
        ${post.image ? `<img src="${post.image}" alt="Post image" />` : ""}
        <button class="upvote-btn" data-index="${posts.length - 1 - index}">👍 ${post.upvotes}</button>
      `;
      postList.appendChild(li);
    });
  };

  if (imageInput) {
    imageInput.addEventListener("change", () => {
      preview.innerHTML = "";
      const file = imageInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const img = document.createElement("img");
          img.src = reader.result;
          preview.appendChild(img);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (postForm) {
    postForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("post-name").value.trim();
      const message = document.getElementById("post-message").value.trim();
      const imageFile = imageInput.files[0];
      const timestamp = new Date().toLocaleString();

      if (!name || !message) {
        alert("Please enter your name and message.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const image = imageFile ? reader.result : null;
        const newPost = {
          name,
          message,
          image,
          time: timestamp,
          upvotes: 0,
        };
        posts.push(newPost);
        localStorage.setItem("communityPosts", JSON.stringify(posts));
        renderPosts();
        postForm.reset();
        preview.innerHTML = "";
      };

      if (imageFile) {
        reader.readAsDataURL(imageFile);
      } else {
        reader.onloadend();
      }
    });
  }

  postList.addEventListener("click", (e) => {
    if (e.target.classList.contains("upvote-btn")) {
      const index = e.target.dataset.index;
      posts[index].upvotes++;
      localStorage.setItem("communityPosts", JSON.stringify(posts));
      renderPosts();
    }
  });

  renderPosts();
}

// ==========================
// Dark Mode Toggle
// ==========================
function initDarkModeToggle() {
  const toggle = document.getElementById("darkToggle");
  const saved = localStorage.getItem("darkMode") === "true";
  if (toggle) {
    toggle.checked = saved;
    document.body.classList.toggle("dark", saved);
    toggle.addEventListener("change", (e) => {
      document.body.classList.toggle("dark", e.target.checked);
      localStorage.setItem("darkMode", e.target.checked);
    });
  }
}

// ==========================
// Dashboard Form Toggles
// ==========================
function initDashboardForms() {
  const toggleButtons = document.querySelectorAll(".dashboard-card");
  const closeButtons = document.querySelectorAll(".close-btn");

  toggleButtons.forEach(button => {
    button.addEventListener("click", () => {
      const formId = button.dataset.target;
      const form = document.getElementById(formId);
      form?.classList.toggle("hidden");
      form?.scrollIntoView({ behavior: "smooth" });
    });
  });

  closeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.close;
      document.getElementById(target)?.classList.add("hidden");
    });
  });
}
"""
        }
    }
}
