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
  if (hash === "resident-dashboard" && window.currentUserRole !== "resident") {
    alert("Only residents can access this page.");
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
});

// ==========================
// Mobile Nav + Dropdown
// ==========================
function initMobileNav() {
  const btn = document.getElementById("hamburgerBtn");
  const nav = document.getElementById("navLinks");
  if (btn && nav) btn.addEventListener("click", () => nav.classList.toggle("open"));
}

function initLoginDropdown() {
  const toggle = document.getElementById("loginToggle");
  const dropdown = document.getElementById("loginDropdown");
  if (toggle && dropdown) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) dropdown.classList.remove("open");
    });
  }
}

// ==========================
// Dashboard Form Handling
// ==========================
function openForm(formId) {
  document.querySelectorAll(".task-form").forEach(f => f.classList.add("hidden"));
  const target = document.getElementById(formId);
  if (target) {
    target.classList.remove("hidden");
    target.scrollIntoView({ behavior: "smooth" });
  }
}

function handleTaskSubmit(e, type) {
  e.preventDefault();
  alert(`${type} submitted!`);
  e.target.reset();
}

function initDashboardForms() {
  // Hooked into HTML already
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