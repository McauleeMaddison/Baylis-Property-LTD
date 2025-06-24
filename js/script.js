document.addEventListener("DOMContentLoaded", () => {
  // Simulated users (for now)
  const users = {
    landlords: [
      { email: "admin@baylis.com", password: "landlord123" }
    ],
    residents: [
      { email: "john@tenant.com", password: "resident123" }
    ]
  };

  // Get all login forms
  const landlordForm = document.querySelector("#landlord-login form");
  const residentForm = document.querySelector("#resident-login form");

  // Landlord login
  landlordForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = landlordForm.querySelector("input[type='email']").value;
    const password = landlordForm.querySelector("input[type='password']").value;

    const match = users.landlords.find(user => user.email === email && user.password === password);

    if (match) {
      alert("Landlord login successful!");
      // Redirect to landlord dashboard (placeholder)
      window.location.href = "landlord-dashboard.html";
    } else {
      alert("Invalid landlord login details.");
    }
  });

  // Resident login
  residentForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = residentForm.querySelector("input[type='email']").value;
    const password = residentForm.querySelector("input[type='password']").value;

    const match = users.residents.find(user => user.email === email && user.password === password);

    if (match) {
      alert("Resident login successful!");
      // Redirect to resident dashboard (placeholder)
      window.location.href = "resident-dashboard.html";
    } else {
      alert("Invalid resident login details.");
    }
  });
});