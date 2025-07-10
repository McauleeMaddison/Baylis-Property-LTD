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

// Firebase configuration
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
  hamburgerBtn.addEventListener("click", () => navLinks.classList.toggle("active"));
  // Login dropdown
  loginToggle.addEventListener("click", () => loginMenu.classList.toggle("show"));
  // SPA navigation
  document.querySelectorAll(".nav-links a, .dropdown-menu a").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const targetId = link.getAttribute("href").substring(1);
      spaSections.forEach(sec => sec.classList.toggle("active", sec.id === targetId));
      navLinks.classList.remove("active");
      loginMenu.classList.remove("show");
    });
  });

  // Open/close form modals
  dashboardCards.forEach(btn => {
    btn.addEventListener("click", () => {
      const form = document.getElementById(btn.dataset.target);
      const wrap = form.closest(".form-wrapper");
      wrap.classList.add("active");
      form.classList.remove("hidden");
    });
  });
  formWrappers.forEach(wrap => {
    wrap.querySelector(".close-btn").addEventListener("click", () => {
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

  // Auth state listener
  onAuthStateChanged(auth, user => {
    logoutBtn.classList.toggle("hide", !user);
  });
  logoutBtn.addEventListener("click", () => signOut(auth));

  // Recent Requests helper
  function addToRecent(type, detail) {
    const list = document.getElementById("recent-requests-list");
    const li = document.createElement("li");
    li.className = "request-item";
    const time = new Date().toLocaleString();
    li.innerHTML = `
      <div class="request-item__info"><strong>${type}:</strong> ${detail}</div>
      <div class="request-item__time">${time}</div>
    `;
    list.prepend(li);
  }

  // Handle task forms
  document.getElementById("repair-form").addEventListener("submit", e => {
    e.preventDefault();
    const [name, addr, desc] = e.target.elements;
    addToRecent("Repair", `${name.value}, ${addr.value}, ${desc.value}`);
    e.target.closest(".form-wrapper").classList.remove("active");
    e.target.classList.add("hidden");
    e.target.reset();
  });
  document.getElementById("cleaning-form").addEventListener("submit", e => {
    e.preventDefault();
    const [name, addr, date] = e.target.elements;
    addToRecent("Cleaning", `${name.value}, ${addr.value} on ${date.value}`);
    e.target.closest(".form-wrapper").classList.remove("active");
    e.target.classList.add("hidden");
    e.target.reset();
  });
  document.getElementById("message-form").addEventListener("submit", e => {
    e.preventDefault();
    const [name, email, msg] = e.target.elements;
    addToRecent("Message", `${name.value}, ${email.value}: ${msg.value}`);
    e.target.closest(".form-wrapper").classList.remove("active");
    e.target.classList.add("hidden");
    e.target.reset();
  });

  // Community: image preview
  imageInput.addEventListener("change", () => {
    previewDiv.innerHTML = '';
    const file = imageInput.files[0];
    if (file) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      previewDiv.appendChild(img);
    }
  });

  // Community: post creation
  postForm.addEventListener("submit", e => {
    e.preventDefault();
    const name = postForm["post-name"].value.trim();
    const msg = postForm["post-message"].value.trim();
    if (!name || !msg) return;
    const li = document.createElement("li");
    li.className = "post-item";
    li.innerHTML = `
      <div class="post-content"><strong>${name}:</strong> ${msg}</div>
      <div class="actions">
        <button class="like-btn">Like <span class="like-count">0</span></button>
        <button class="reply-btn">Reply</button>
      </div>
      <div class="reply-box">
        <input type="text" placeholder="Write a reply..." />
        <button class="submit-reply">Send</button>
      </div>
    `;
    postList.prepend(li);
    postForm.reset();
    previewDiv.innerHTML = '';

    // Like handler
    const likeBtn = li.querySelector(".like-btn");
    const countSpan = li.querySelector(".like-count");
    likeBtn.addEventListener("click", () => {
      let count = parseInt(countSpan.textContent, 10) || 0;
      countSpan.textContent = ++count;
    });

    // Reply handler
    const replyBtn = li.querySelector(".reply-btn");
    const replyBox = li.querySelector(".reply-box");
    const submitReply = li.querySelector(".submit-reply");
    replyBtn.addEventListener("click", () => replyBox.classList.toggle("visible"));
    submitReply.addEventListener("click", () => {
      const input = replyBox.querySelector("input");
      const text = input.value.trim();
      if (!text) return;
      const replyEl = document.createElement("p");
      replyEl.className = "reply-text";
      replyEl.textContent = text;
      li.appendChild(replyEl);
      input.value = '';
      replyBox.classList.remove("visible");
    });
  });
});
