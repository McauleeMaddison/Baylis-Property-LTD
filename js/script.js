// ========== SPA Section Switching ==========
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

// ========== Mobile Nav Dropdown + Hamburger ==========
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");
  const dropdownLink = document.querySelector(".dropdown > a");
  const dropdown = document.querySelector(".dropdown");

  if (hamburger) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }

  if (dropdownLink && window.innerWidth <= 768) {
    dropdownLink.addEventListener("click", (e) => {
      e.preventDefault();
      dropdown.classList.toggle("open");
    });
  }

  // ========== Community Arena Logic ==========
  const postForm = document.getElementById("post-form");
  const postList = document.getElementById("post-list");
  const imageInput = document.getElementById("post-image");
  const preview = document.getElementById("image-preview");

  let posts = JSON.parse(localStorage.getItem("communityPosts")) || [];

  function renderPosts() {
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
  }

  // Image preview before posting
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

  // Submit new post
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
        reader.onloadend(); // call directly if no image
      }
    });
  }

  // Handle upvotes
  if (postList) {
    postList.addEventListener("click", (e) => {
      if (e.target.classList.contains("upvote-btn")) {
        const index = e.target.dataset.index;
        posts[index].upvotes++;
        localStorage.setItem("communityPosts", JSON.stringify(posts));
        renderPosts();
      }
    });
  }

  renderPosts(); // Initial render
});
