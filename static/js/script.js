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

    function getApiBase() {
      return window.API_BASE || body.getAttribute("data-api-base") || "/api";
    }

    function updateNavHeight() {
      if (!navLinks) return;

      if (navLinks.dataset.open === "true") {
        navLinks.style.maxHeight = `${navLinks.scrollHeight}px`;
      }
    }

    function setNavOpen(open) {
      if (!hamburgerBtn || !navLinks) return;

      navLinks.classList.toggle("show", Boolean(open));
      navLinks.dataset.open = String(Boolean(open));
      hamburgerBtn.setAttribute("aria-expanded", String(Boolean(open)));
      navLinks.style.maxHeight = open ? `${navLinks.scrollHeight}px` : "0px";
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

    hamburgerBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      toggleNav();
    });

    navLinks?.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;

      if (window.matchMedia("(max-width: 1024px)").matches) {
        closeNav();
      }
    });

    window.addEventListener("resize", () => {
      if (!navLinks) return;

      if (window.matchMedia("(min-width: 1025px)").matches) {
        navLinks.classList.remove("show");
        navLinks.dataset.open = "false";
        navLinks.style.maxHeight = "";
        hamburgerBtn?.setAttribute("aria-expanded", "false");
      } else {
        updateNavHeight();
      }
    });

    document.addEventListener("keyup", (event) => {
      if (event.key === "Escape") {
        closeNav();
      }
    });

    const yearEl = document.getElementById("year");
    if (yearEl) {
      yearEl.textContent = String(new Date().getFullYear());
    }

    applyAuthAwareNavigation();
  });
})();