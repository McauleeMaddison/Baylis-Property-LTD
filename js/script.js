// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Config + init
const firebaseConfig = {
  apiKey: "AIzaSyBc2xWdvMNDtrmCFSG1zHL1lV-OxJx1uiE",
  authDomain: "baylis-property-ltd.firebaseapp.com",
  projectId: "baylis-property-ltd",
  storageBucket: "baylis-property-ltd.appspot.com",
  messagingSenderId: "288885561422",
  appId: "1:288885561422:web:bd2a50f4727d782a260b1f",
  measurementId: "G-4VT24D0H09"
};
const app = initializeApp(firebaseConfig);
getAnalytics(app);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const navLinks     = document.getElementById("navLinks");
  const loginToggle  = document.getElementById("loginToggle");
  const loginMenu    = document.getElementById("loginMenu");
  const logoutBtn    = document.getElementById("logoutBtn");
  const darkToggle   = document.getElementById("darkToggle");
  const spaSections  = document.querySelectorAll(".spa-section");
  const dashboardCards = document.querySelectorAll(".dashboard-card");
  const formWrappers = document.querySelectorAll(".form-wrapper");
  const postForm     = document.getElementById("post-form");
  const imageInput   = document.getElementById("post-image");
  const previewDiv   = document.getElementById("image-preview");
  const postList     = document.getElementById("post-list");

  // Mobile nav toggle
  hamburgerBtn.addEventListener("click", () =>
    navLinks.classList.toggle("active")
  );

  // Login dropdown
  loginToggle.addEventListener("click", () =>
    loginMenu.classList.toggle("show")
  );

  // SPA nav
  document
    .querySelectorAll(".nav-links a, .dropdown-menu a")
    .forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        const tgt = link.getAttribute("href").slice(1);
        spaSections.forEach(s => s.classList.toggle("active", s.id === tgt));
        navLinks.classList.remove("active");
        loginMenu.classList.remove("show");
      });
    });

  // Dashboard cards open forms
  dashboardCards.forEach(btn => {
    btn.addEventListener("click", () => {
      const form = document.getElementById(btn.dataset.target);
      form.classList.remove("hidden");
      form.parentElement.style.display = "block";
    });
  });

  // Close buttons
  document.querySelectorAll(".close-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const wrap = btn.closest(".form-wrapper");
      wrap.querySelector(".task-form").classList.add("hidden");
      wrap.style.display = "none";
    });
  });

  // Dark mode persistence
  darkToggle.checked = localStorage.getItem("dark") === "true";
  darkToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark", darkToggle.checked);
    localStorage.setItem("dark", darkToggle.checked);
  });
  if (darkToggle.checked) document.body.classList.add("dark");

  // Auth state
  onAuthStateChanged(auth, user => {
    if (user) {
      logoutBtn.classList.remove("hide");
    } else {
      logoutBtn.classList.add("hide");
    }
  });

  // Register
  document.getElementById("register-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = e.target["register-email"].value;
    const pw    = e.target["register-password"].value;
    try {
      await createUserWithEmailAndPassword(auth, email, pw);
      alert("Registered! Logged in as " + email);
      document.querySelector('a[href="#home"]').click();
    } catch(err) {
      alert(err.message);
    }
  });

  // Landlord login
  document.getElementById("landlord-login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = e.target["landlord-email"].value;
    const pw    = e.target["landlord-password"].value;
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      alert("Welcome back, landlord!");
      document.querySelector('a[href="#home"]').click();
    } catch(err) {
      alert(err.message);
    }
  });

  // Resident login
  document.getElementById("resident-login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = e.target["resident-email"].value;
    const pw    = e.target["resident-password"].value;
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      alert("Welcome back, resident!");
      document.querySelector('a[href="#home"]').click();
    } catch(err) {
      alert(err.message);
    }
  });

  // Logout
  logoutBtn.addEventListener("click", () => signOut(auth));

  // Community post preview
  imageInput.addEventListener("change", () => {
    previewDiv.innerHTML = "";
    const file = imageInput.files[0];
    if (!file) return;
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    previewDiv.appendChild(img);
  });

  // Community post submit
  postForm.addEventListener("submit", e => {
    e.preventDefault();
    const name = e.target["post-name"].value;
    const msg  = e.target["post-message"].value;
    const li   = document.createElement("li");
    li.innerHTML = `<strong>${name}:</strong> ${msg}`;
    if (imageInput.files[0]) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(imageInput.files[0]);
      li.appendChild(img);
    }
    postList.prepend(li);
    postForm.reset();
    previewDiv.innerHTML = "";
  });
});

