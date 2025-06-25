document.addEventListener("DOMContentLoaded", () => {
  // Dummy users
  const users = {
    landlords: [
      { email: "admin@baylis.com", password: "landlord123" }
    ],
    residents: [
      { email: "john@tenant.com", password: "resident123" }
    ]
  };

  // LOGIN HANDLING
  const landlordForm = document.querySelector("#landlord-login form");
  const residentForm = document.querySelector("#resident-login form");

  if (landlordForm) {
    landlordForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = landlordForm.querySelector("input[type='email']").value;
      const password = landlordForm.querySelector("input[type='password']").value;

      const match = users.landlords.find(
        (user) => user.email === email && user.password === password
      );

      if (match) {
        alert("Landlord login successful!");
        window.location.href = "#community"; // temporary redirect
      } else {
        alert("Invalid landlord login.");
      }
    });
  }

  if (residentForm) {
    residentForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = residentForm.querySelector("input[type='email']").value;
      const password = residentForm.querySelector("input[type='password']").value;

      const match = users.residents.find(
        (user) => user.email === email && user.password === password
      );

      if (match) {
        alert("Resident login successful!");
        window.location.href = "#community"; // temporary redirect
      } else {
        alert("Invalid resident login.");
      }
    });
  }

  // COMMUNITY ARENA POSTING
  const postForm = document.getElementById("post-form");
  const postList = document.getElementById("post-list");

  if (postForm && postList) {
    postForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("post-name").value.trim();
      const message = document.getElementById("post-message").value.trim();

      if (name && message) {
        const li = document.createElement("li");
        li.className = "post";
        li.innerHTML = `<strong>${name}</strong>: ${message}`;
        postList.prepend(li);

        // Clear form
        postForm.reset();
      } else {
        alert("Please fill in both name and message.");
      }
    });
  }
});
function showSection(sectionId) {
  const sections = document.querySelectorAll(".spa-section");
  sections.forEach(sec => sec.classList.remove("active"));

  const target = document.getElementById(sectionId);
  if (target) target.classList.add("active");
}

function handleHashChange() {
  const hash = location.hash.replace("#", "") || "home";
  showSection(hash);
}

window.addEventListener("hashchange", handleHashChange);
window.addEventListener("load", handleHashChange);