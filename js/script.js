// ==========================
// SPA Section Switching
// ==========================
function showSection(sectionId) {
  document.querySelectorAll(".spa-section").forEach(section => section.classList.remove("active"));
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
// Dashboard Form Controls
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

function handleTaskSubmit(e, type) {
  e.preventDefault();
  alert(`${type} request submitted!`);
  e.target.reset();
}

// ==========================
// Community Arena
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
// Dark Mode Toggle
// ==========================
function initDarkModeToggle() {
  const toggle = document.getElementById("darkToggle");
  const saved = localStorage.getItem("darkMode") === "true";
  if (toggle) {
    toggle.checked = saved;
    document.body.classList.toggle("dark-mode", saved);
    toggle.addEventListener("change", (e) => {
      document.body.classList.toggle("dark-mode", e.target.checked);
      localStorage.setItem("darkMode", e.target.checked);
    });
  }
}
// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBc2xWdvMNDtrmCFSG1zHL1lV-OxJx1uiE",
  authDomain: "baylis-property-ltd.firebaseapp.com",
  projectId: "baylis-property-ltd",
  storageBucket: "baylis-property-ltd.appspot.com",
  messagingSenderId: "288885561422",
  appId: "1:288885561422:web:bd2a50f4727d782a260b1f",
  measurementId: "G-4VT24D0H09"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');
  const loginToggle = document.getElementById('loginToggle');
  const loginMenu = document.getElementById('loginMenu');
  const logoutBtn = document.getElementById('logoutBtn');
  const spaSections = document.querySelectorAll('.spa-section');

  // Toggle mobile nav
  hamburgerBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });

  // Toggle login dropdown
  loginToggle.addEventListener('click', () => {
    loginMenu.classList.toggle('show');
  });

  // SPA navigation
  document.querySelectorAll('.nav-links a, .dropdown-menu a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      spaSections.forEach(sec => sec.classList.toggle('active', sec.id === targetId));
      if(navLinks.classList.contains('active')) navLinks.classList.remove('active');
      if(loginMenu.classList.contains('show')) loginMenu.classList.remove('show');
    });
  });

  // Close forms/buttons
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.close;
      document.getElementById(target).classList.add('hidden');
    });
  });

  // Authentication state listener
  onAuthStateChanged(auth, user => {
    if(user) {
      logoutBtn.style.display = 'inline-block';
      loginToggle.parentElement.style.display = 'none';
      // Optionally show dashboard
      spaSections.forEach(sec => sec.classList.toggle('active', sec.id === 'home'));
    } else {
      logoutBtn.style.display = 'none';
      loginToggle.parentElement.style.display = 'inline-block';
    }
  });

  // Register
  document.getElementById('register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Optionally store role in database
      alert('Registration successful!');
      spaSections.forEach(sec => sec.classList.toggle('active', sec.id === 'home'));
    } catch(error) {
      alert(error.message);
    }
  });

  // Landlord Login
  document.getElementById('landlord-login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch(error) {
      alert(error.message);
    }
  });

  // Resident Login
  document.getElementById('resident-login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('resident-email').value;
    const password = document.getElementById('resident-password').value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch(error) {
      alert(error.message);
    }
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    signOut(auth);
  });
});
