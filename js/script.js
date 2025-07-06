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
});

// ==========================
// Mobile Hamburger Nav
// ==========================
function initMobileNav() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const navLinks = document.getElementById("navLinks");

  if (hamburgerBtn && navLinks) {
    hamburgerBtn.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }
}

// ==========================
// Login Dropdown Toggle
// ==========================
function initLoginDropdown() {
  const loginToggle = document.getElementById("loginToggle");
  const loginDropdown = document.getElementById("loginDropdown");

  if (loginToggle && loginDropdown) {
    loginToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      loginDropdown.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
      if (!loginDropdown.contains(e.target)) {
        loginDropdown.classList.remove("open");
      }
    });
  }
}

// ==========================
// Dashboard Forms Logic
// ==========================
function openForm(formId) {
  const allForms = document.querySelectorAll(".task-form");
  const targetForm = document.getElementById(formId);

  if (!targetForm) return;

  if (!targetForm.classList.contains("hidden")) {
    targetForm.classList.add("hidden");
    return;
  }

  allForms.forEach((form) => form.classList.add("hidden"));
  targetForm.classList.remove("hidden");
  targetForm.scrollIntoView({ behavior: "smooth" });
}

function handleTaskSubmit(e, type) {
  e.preventDefault();
  alert(`${type} request submitted! (Replace this with Firebase integration)`);
  e.target.reset();
}

function initDashboardForms() {
  // nothing to attach yet — forms are HTML-triggered
}

// ==========================
// Community Arena
// ==========================
function initCommunityArena() {
  const postForm = document.getElementById("post-form");
  const postList = document.getElementById("post-list");
  const imageInput = document.getElementById("post-image");
  const preview = document.getElementById("image-preview");

  if (!postForm || !postList) return;

  let posts = JSON.parse(localStorage.getItem("communityPosts")) || [];

  const renderPosts = () => {
    postList.innerHTML = "";
    posts
      .slice()
      .reverse()
      .forEach((post, index) => {
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
// Auto-resize Textareas
// ==========================
function initTextareaAutoResize() {
  document.addEventListener("input", (e) => {
    if (e.target.tagName.toLowerCase() === "textarea") {
      e.target.style.height = "auto";
      e.target.style.height = `${e.target.scrollHeight}px`;
    }
  });
}

