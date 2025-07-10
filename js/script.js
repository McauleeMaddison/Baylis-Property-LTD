// js/script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Firebase config + initialize
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

// Wait for DOM
document.addEventListener("DOMContentLoaded", () => {
  // Element refs
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

  // Mobile navigation toggle
  hamburgerBtn.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });

  // Login dropdown toggle
  loginToggle.addEventListener("click", () => {
    loginMenu.classList.toggle("show");
  });

  // Single Page App (SPA) navigation
  document.querySelectorAll(".nav-links a, .dropdown-menu a").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const targetId = link.getAttribute("href").substring(1);
      spaSections.forEach(section => {
        section.classList.toggle("active", section.id === targetId);
      });
      navLinks.classList.remove("active");
      loginMenu.classList.remove("show");
    });
  });

  // Open form modals
  dashboardCards.forEach(btn => {
    btn.addEventListener("click", () => {
      const form = document.getElementById(btn.dataset.target);
      const wrapper = form.closest(".form-wrapper");
      wrapper.classList.add("active");
      form.classList.remove("hidden");
    });
  });

  // Close form modals
  formWrappers.forEach(wrapper => {
    const closeBtn = wrapper.querySelector(".close-btn");
    closeBtn.addEventListener("click", () => {
      wrapper.classList.remove("active");
      wrapper.querySelector(".task-form").classList.add("hidden");
    });
  });

  // Dark mode toggle and persistence
  darkToggle.checked = localStorage.getItem("dark") === "true";
  document.body.classList.toggle("dark", darkToggle.checked);
  darkToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark", darkToggle.checked);
    localStorage.setItem("dark", darkToggle.checked);
  });

  // Auth state listener
  onAuthStateChanged(auth, user => {
    logoutBtn.classList.toggle("hide", !user);
  });

  // Helper to add entries to recent requests
  function addToRecent(type, data) {
    const list = document.getElementById("recent-requests-list");
    const li = document.createElement("li");
    li.className = "request-item";
    const timestamp = new Date().toLocaleString();
    li.innerHTML = `
      <div class="request-item__info">
        <strong>${type}:</strong> ${data.name} — ${data.detail}
      </div>
      <div class="request-item__time">${timestamp}</div>
    `;
    list.prepend(li);
  }

  // Form submission handlers
  document.getElementById("repair-form").addEventListener("submit", e => {
    e.preventDefault();
    const [nameInput, addrInput, detailInput] = e.target.elements;
    addToRecent("Repair", { name: nameInput.value, detail: addrInput.value + ", " + detailInput.value });
    e.target.reset();
    e.target.closest(".form-wrapper").classList.remove("active");
    e.target.classList.add("hidden");
  });

  document.getElementById("cleaning-form").addEventListener("submit", e => {
    e.preventDefault();
    const [nameInput, addrInput, dateInput] = e.target.elements;
    addToRecent("Cleaning", { name: nameInput.value, detail: addrInput.value + " on " + dateInput.value });
    e.target.reset();
    e.target.closest(".form-wrapper").classList.remove("active");
    e.target.classList.add("hidden");
  });

  document.getElementById("message-form").addEventListener("submit", e => {
    e.preventDefault();
    const [nameInput, emailInput, msgInput] = e.target.elements;
    addToRecent("Message", { name: nameInput.value, detail: emailInput.value + ": " + msgInput.value });
    e.target.reset();
    e.target.closest(".form-wrapper").classList.remove("active");
    e.target.classList.add("hidden");
  });

  // Logout button
  logoutBtn.addEventListener("click", () => {
    signOut(auth);
  });

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
    const message = e.target["post-message"].value;
    const li = document.createElement("li");
    li.innerHTML = `<strong>${name}:</strong> ${message}`;
    const file = imageInput.files[0];
    if (file) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      li.appendChild(img);
    }
    postList.prepend(li);
    postForm.reset();
    previewDiv.innerHTML = "";
  });
});
