(() => {
  if (typeof document === "undefined") return;
  const API_BASE = document.body?.getAttribute("data-api-base") || window.API_BASE || "/api";
  const requestForm = document.getElementById("resetRequestForm");
  const resetForm = document.getElementById("resetForm");
  const msg = document.getElementById("resetMsg");
  const identityEl = document.getElementById("resetIdentity");
  const tokenEl = document.getElementById("resetToken");
  const passEl = document.getElementById("resetPassword");
  const confirmEl = document.getElementById("resetConfirm");

  const setMsg = (text, ok = false) => {
    if (!msg) return;
    msg.textContent = text;
    msg.className = ok ? "success" : "error";
    msg.setAttribute("role", "alert");
    msg.setAttribute("aria-live", ok ? "polite" : "assertive");
  };

  const postJSON = async (path, payload) => {
    const opts = {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    };
    if (typeof window.fetchWithCsrf === "function") {
      return window.fetchWithCsrf(`${API_BASE}${path}`, { apiBase: API_BASE, ...opts });
    }
    return fetch(`${API_BASE}${path}`, opts);
  };

  requestForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const identity = (identityEl?.value || "").trim();
    if (!identity) return setMsg("Enter your email or username.");
    setMsg("Sending reset code…", true);
    try {
      const payload = /\S+@\S+\.\S+/.test(identity)
        ? { email: identity }
        : { username: identity };
      const res = await postJSON("/auth/request-reset", payload);
      if (!res.ok) throw new Error("Request failed");
      setMsg("If the account exists, a reset code was sent. Check your inbox.", true);
    } catch {
      setMsg("Unable to send reset code right now. Try again soon.");
    }
  });

  resetForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = (tokenEl?.value || "").trim();
    const password = passEl?.value || "";
    const confirm = confirmEl?.value || "";
    if (!token || !password || !confirm) return setMsg("Fill in all fields.");
    if (password.length < 6) return setMsg("Password must be at least 6 characters.");
    if (password !== confirm) return setMsg("Passwords do not match.");
    setMsg("Updating password…", true);
    try {
      const res = await postJSON("/auth/reset", { token, password });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Unable to reset password.");
      setMsg("Password updated. You can sign in now.", true);
      resetForm.reset();
    } catch (err) {
      setMsg(err.message || "Unable to reset password.");
    }
  });
})();
