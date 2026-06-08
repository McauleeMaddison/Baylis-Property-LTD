(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  ready(() => {
    const body = document.body;
    if (!body) return;

    const hamburgerBtn = document.querySelector("[data-hamb]");
    const navLinks = document.querySelector("[data-links]");
    const mobileNavQuery = window.matchMedia("(max-width: 1024px)");
    const desktopNavQuery = window.matchMedia("(min-width: 1025px)");

    function getApiBase() {
      return window.API_BASE || body.getAttribute("data-api-base") || "/api";
    }

    function ensureUserPill() {
      if (!navLinks) return null;

      let pill = navLinks.querySelector(".nav-user-pill");
      if (pill) return pill;

      pill = document.createElement("span");
      pill.className = "nav-user-pill";
      pill.hidden = true;
      pill.setAttribute("aria-live", "polite");

      const logoutLink = navLinks.querySelector("#logoutBtn");
      navLinks.insertBefore(pill, logoutLink || null);
      return pill;
    }

    function setUserPill(user) {
      const pill = ensureUserPill();
      if (!pill) return;

      if (!user) {
        pill.hidden = true;
        pill.textContent = "";
        body.removeAttribute("data-current-user");
        return;
      }

      const displayName = user.profile?.displayName || user.username || user.email?.split("@")[0] || "User";
      const role = String(user.role || "member").toLowerCase();
      const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

      pill.hidden = false;
      pill.textContent = `${displayName} · ${roleLabel}`;
      body.dataset.currentUser = displayName;
    }

    function updateNavHeight() {
      if (!navLinks) return;

      if (desktopNavQuery.matches) {
        navLinks.style.maxHeight = "";
        return;
      }

      if (navLinks.dataset.open === "true") {
        navLinks.style.maxHeight = `${navLinks.scrollHeight}px`;
      }
    }

    function setNavOpen(open) {
      if (!hamburgerBtn || !navLinks) return;

      if (desktopNavQuery.matches) {
        open = false;
      }

      navLinks.classList.toggle("show", Boolean(open));
      navLinks.dataset.open = String(Boolean(open));
      body.classList.toggle("is-nav-open", Boolean(open));
      body.classList.toggle("nav-open", Boolean(open));
      hamburgerBtn.setAttribute("aria-expanded", String(Boolean(open)));
      navLinks.style.maxHeight = open && mobileNavQuery.matches ? `${navLinks.scrollHeight}px` : "";
    }

    function closeNav() {
      setNavOpen(false);
    }

    function toggleNav() {
      const isOpen = navLinks?.dataset.open === "true";
      setNavOpen(!isOpen);
    }

    function setHidden(selector, hidden) {
      document.querySelectorAll(selector).forEach((el) => {
        el.hidden = Boolean(hidden);
        el.classList.toggle("nav-hidden", Boolean(hidden));
      });
    }

    function setLogoutLink() {
      document.querySelectorAll("#logoutBtn").forEach((link) => {
        link.href = "/logout";
        link.textContent = "Logout";
      });
    }

    async function getCurrentUser() {
      try {
        const response = await fetch(`${getApiBase()}/auth/me`, {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) return null;

        const data = await response.json().catch(() => null);
        return data?.user || null;
      } catch (_) {
        return null;
      }
    }

    async function applyAuthAwareNavigation() {
      setLogoutLink();

      const user = await getCurrentUser();

      const loginSelector = '[data-test="nav-login"]';
      const registerSelector = '[data-test="nav-register"]';
      const logoutSelector = "#logoutBtn";
      const residentSelector = '[data-test="nav-resident"]';
      const landlordSelector = '[data-test="nav-landlord"]';

      if (!user) {
        body.classList.remove("is-authenticated");
        body.removeAttribute("data-current-role");
        setUserPill(null);

        setHidden(loginSelector, false);
        setHidden(registerSelector, false);
        setHidden(logoutSelector, true);
        setHidden(residentSelector, false);
        setHidden(landlordSelector, false);

        updateNavHeight();
        return;
      }

      const role = String(user.role || "").toLowerCase();

      body.classList.add("is-authenticated");
      body.dataset.currentRole = role;
      setUserPill(user);

      setHidden(loginSelector, true);
      setHidden(registerSelector, true);
      setHidden(logoutSelector, false);

      if (role === "resident") {
        setHidden(residentSelector, false);
        setHidden(landlordSelector, true);
      } else if (role === "landlord") {
        setHidden(residentSelector, true);
        setHidden(landlordSelector, false);
      }

      updateNavHeight();
    }

    if (hamburgerBtn && navLinks && !hamburgerBtn.dataset.bound) {
      hamburgerBtn.dataset.bound = "true";
      hamburgerBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleNav();
      });
    }

    if (navLinks && !navLinks.dataset.bound) {
      navLinks.dataset.bound = "true";
      navLinks.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (!link) return;

        if (mobileNavQuery.matches) {
          closeNav();
        }
      });
    }

    window.addEventListener("resize", () => {
      if (!navLinks) return;

      if (desktopNavQuery.matches) {
        closeNav();
      } else {
        updateNavHeight();
      }
    });

    document.addEventListener("keyup", (event) => {
      if (event.key === "Escape") {
        closeNav();
      }
    });

    document.addEventListener("click", (event) => {
      if (!navLinks || !hamburgerBtn || navLinks.dataset.open !== "true") return;
      if (navLinks.contains(event.target) || hamburgerBtn.contains(event.target)) return;
      closeNav();
    });

    const yearEl = document.getElementById("year");
    if (yearEl) {
      yearEl.textContent = String(new Date().getFullYear());
    }

    window.BaylisRefreshNavigation = applyAuthAwareNavigation;

    if (!window.showToast) {
      window.showToast = function showToast(message) {
        const toast = document.createElement("div");
        toast.className = "toast";
        toast.textContent = String(message || "");
        document.body.appendChild(toast);
        window.setTimeout(() => toast.classList.add("show"), 10);
        window.setTimeout(() => {
          toast.classList.remove("show");
          window.setTimeout(() => toast.remove(), 250);
        }, 3200);
      };
    }

    setUserPill(null);
    setNavOpen(false);
    applyAuthAwareNavigation();
  });
})();
