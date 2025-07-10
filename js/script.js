import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Firebase config + init
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

  // Mobile nav
  hamburgerBtn.addEventListener("click", () => navLinks.classList.toggle("active"));
  // Login dropdown
  loginToggle.addEventListener("click", () => loginMenu.classList.toggle("show"));
  // SPA nav
  document.querySelectorAll(".nav-links a, .dropdown-menu a").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const tgt = link.getAttribute("href").slice(1);
      spaSections.forEach(s => s.classList.toggle("active", s.id === tgt));
      navLinks.classList.remove("active");
      loginMenu.classList.remove("show");
    });
  });

  // Open modals
  dashboardCards.forEach(btn => {
    btn.addEventListener("click", () => {
      const form = document.getElementById(btn.dataset.target);
      const wrap = form.closest(".form-wrapper");
      wrap.classList.add("active");
      form.classList.remove("hidden");
    });
  });
  // Close modals
  document.querySelectorAll(".close-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const wrap = btn.closest(".form-wrapper");
      wrap.classList.remove("active");
      wrap.querySelector(".task-form").classList.add("hidden");
    });
  });

  // Dark mode persistence
  darkToggle.checked = localStorage.getItem("dark") === "true";
  document.body.classList.toggle("dark", darkToggle.checked);
  darkToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark", darkToggle.checked);
    localStorage.setItem("dark", darkToggle.checked);
  });

  // Auth state
  onAuthStateChanged(auth, user => {
    logoutBtn.classList.toggle("hide", !user);
  });

  // Helper: add to recent
  function addToRecent(type, data) {
    const list = document.getElementById("recent-requests-list");
    const li = document.createElement("li");
    li.className = "request-item";
    const when = new Date().toLocaleString();
    li.innerHTML = `
      <div class="request-item__info">
        <strong>${type}:</strong> ${data.name} — ${data.detail}
      </div>
      <div class="request-item__time">${when}</div>
    `;
    list.prepend(li);
  }

  // Register
  document.getElementById("register-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = e.target["register-email"].value;
    const pw    = e.target["register-password"].value;
    try {
      await createUserWithEmailAndPassword(auth, email, pw);
      alert("Registered! Logged in as " + email);
      document.querySelector('a[href="#home"]').click();
    } catch(err) { alert(err.message); }
  });

  // Landlord login
  document.getElementById("landlord-login-form").addEvent
