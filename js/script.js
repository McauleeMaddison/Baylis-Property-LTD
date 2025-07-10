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

// Init Firebase
const firebaseConfig = { /* ... */ };
const app = initializeApp(firebaseConfig);
getAnalytics(app);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
  // ... existing modal, nav, auth, dark-mode code

  const postList = document.getElementById("post-list");

  // Create a post with actions
  document.getElementById("post-form").addEventListener("submit", e => {
    e.preventDefault();
    const name = e.target["post-name"].value;
    const msg = e.target["post-message"].value;
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${name}:</strong> ${msg}
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
    e.target.reset();

    // Event delegation: set up listeners on the new item
    const likeBtn = li.querySelector(".like-btn");
    const countSpan = li.querySelector(".like-count");
    likeBtn.addEventListener("click", () => {
      let count = parseInt(countSpan.textContent, 10);
      countSpan.textContent = ++count;
    });
    const replyBtn = li.querySelector(".reply-btn");
    const replyBox = li.querySelector(".reply-box");
    replyBtn.addEventListener("click", () => {
      li.classList.toggle("replied");
    });
    const submitReply = li.querySelector(".submit-reply");
    submitReply.addEventListener("click", () => {
      const input = replyBox.querySelector("input");
      const replyText = input.value.trim();
      if (!replyText) return;
      const replyEl = document.createElement("p");
      replyEl.textContent = replyText;
      replyEl.className = "reply-text";
      li.appendChild(replyEl);
      input.value = "";
      li.classList.remove("replied");
    });
  });
