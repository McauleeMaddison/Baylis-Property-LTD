document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('roleSelect').value;
  const msgDiv = document.getElementById('loginMsg');

  // Demo: for real use, connect to backend!
  if ((role === "resident" && password === "resident123") ||
      (role === "landlord" && password === "landlord123")) {
    localStorage.setItem('user', JSON.stringify({ username, role }));
    window.location.href = role === "landlord"
      ? "dashboard-landlord.html"
      : "dashboard-resident.html";
  } else {
    msgDiv.textContent = "Invalid login";
    msgDiv.className = "error";
  }
});
