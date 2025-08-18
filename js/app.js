/* ==========================================================================
 * APP core (no backend)
 * Exposes window.APP with: auth, settings, store, utils, events
 * ========================================================================== */
(() => {
  "use strict";

  // Don't stomp your existing toast; use it if present.
  const showToast = window.showToast || ((msg) => alert(msg));

  // Shorthands
  const qs  = (s, c = document) => c.querySelector(s);
  const qsa = (s, c = document) => Array.from(c.querySelectorAll(s));

  // Simple event bus
  const events = (() => {
    const map = new Map();
    return {
      on(ev, fn) { map.set(ev, [...(map.get(ev) || []), fn]); return () => this.off(ev, fn); },
      off(ev, fn) { map.set(ev, (map.get(ev) || []).filter(f => f !== fn)); },
      emit(ev, payload) { (map.get(ev) || []).forEach(fn => { try { fn(payload); } catch {} }); }
    };
  })();

  /* ----------------------------- Settings ----------------------------- */
  const SETTINGS_KEY = "appSettings";
  const SETTINGS_DEFAULTS = {
    general:   { showTips: false, defaultLanding: "/index.html", timeFormat: "24h" },
    appearance:{ darkMode: JSON.parse(localStorage.getItem("darkMode") || "false"),
                 accent: localStorage.getItem("accent") || "blue",
                 density: "comfortable", fontSize: 16, radius: 12 },
    notify:    { requests: true, community: false, digest: false, digestDay: "Monday" },
    privacy:   {},
  };

  function readSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return structuredClone(SETTINGS_DEFAULTS);
      const s = JSON.parse(raw);
      // merge defaults to keep shape
      return {
        general:   { ...SETTINGS_DEFAULTS.general,   ...(s.general || {}) },
        appearance:{ ...SETTINGS_DEFAULTS.appearance,...(s.appearance || {}) },
        notify:    { ...SETTINGS_DEFAULTS.notify,    ...(s.notify || {}) },
        privacy:   { ...SETTINGS_DEFAULTS.privacy,   ...(s.privacy || {}) },
      };
    } catch { return structuredClone(SETTINGS_DEFAULTS); }
  }
  function writeSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    // keep legacy keys your script.js reads
    localStorage.setItem("darkMode", s.appearance.darkMode ? "true" : "false");
    localStorage.setItem("accent", s.appearance.accent || "blue");
    events.emit("settings:change", s);
  }
  function applyAppearance(s) {
    const root = document.documentElement;
    const body = document.body;
    const a = s.appearance || readSettings().appearance;
    body.classList.toggle("dark", !!a.darkMode);
    root.setAttribute("data-accent", a.accent || "blue");
    root.style.setProperty("--radius", `${a.radius || 12}px`);
    root.style.setProperty("--base-font-size", `${a.fontSize || 16}px`);
    root.classList.remove("density-compact","density-comfortable","density-spacious");
    root.classList.add(`density-${a.density || "comfortable"}`);
  }

  /* ----------------------------- Auth ----------------------------- */
  // Users are stored in localStorage.users = [{username,email,passwordHash,role,profile,...}]
  const USERS_KEY = "users";
  const SESSION_KEY = "token"; // legacy key used by your auth guard
  const ROLE_KEY = "role";
  const NAME_KEY = "username";

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
    catch { return []; }
  }
  function setUsers(list) {
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
  }

  function hash(pw) {
    // Light hash (not secure; front-end only)
    let h = 2166136261 >>> 0;
    for (let i = 0; i < pw.length; i++) { h ^= pw.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ("0000000" + (h >>> 0).toString(16)).slice(-8);
  }

  function currentUser() {
    const token = localStorage.getItem(SESSION_KEY);
    if (!token) return null;
    const users = getUsers();
    return users.find(u => u.username === localStorage.getItem(NAME_KEY)) || null;
  }

  function login({ emailOrUser, password }) {
    const users = getUsers();
    const user = users.find(u => u.email === emailOrUser || u.username === emailOrUser);
    if (!user) return { ok:false, message:"User not found" };
    if (user.passwordHash !== hash(password)) return { ok:false, message:"Incorrect password" };
    localStorage.setItem(SESSION_KEY, `local.${Date.now()}`); // dummy token
    localStorage.setItem(ROLE_KEY, (user.role || "resident").toLowerCase());
    localStorage.setItem(NAME_KEY, user.username || user.email);
    return { ok:true, user };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ROLE_KEY);
    // keep username for title personalization if you like, or clear it:
    // localStorage.removeItem(NAME_KEY);
  }

  function register({ username, email, role, password }) {
    const users = getUsers();
    if (users.some(u => u.email === email || u.username === username)) {
      return { ok:false, message:"Email or username already in use" };
    }
    const user = {
      username,
      email,
      role: role || "resident",
      passwordHash: hash(password),
      profile: { displayName: username },
      contact: {},
      prefs: {},
      createdAt: Date.now()
    };
    users.push(user);
    setUsers(users);
    // auto-login:
    localStorage.setItem(SESSION_KEY, `local.${Date.now()}`);
    localStorage.setItem(ROLE_KEY, (user.role || "resident").toLowerCase());
    localStorage.setItem(NAME_KEY, user.username);
    return { ok:true, user };
  }

  /* ----------------------------- Data Store (local) ----------------------------- */
  // Keys:
  //   log:cleaning   -> [{name,date,type,address,status,createdAt}]
  //   log:repair     -> [{name,issue,address,status,createdAt}]
  //   log:community  -> [{name,message,title,createdAt}]
  function getList(key) { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }
  function setList(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }

  function submitCleaning(payload) {
    const arr = getList("log:cleaning");
    const doc = { status:"open", createdAt: Date.now(), ...payload };
    setList("log:cleaning", [doc, ...arr].slice(0, 200));
    return doc;
  }
  function submitRepair(payload) {
    const arr = getList("log:repair");
    const doc = { status:"open", createdAt: Date.now(), ...payload };
    setList("log:repair", [doc, ...arr].slice(0, 200));
    return doc;
  }
  function submitMessage(payload) {
    const arr = getList("log:community");
    const doc = { title: payload.title || "Post", createdAt: Date.now(), ...payload };
    setList("log:community", [doc, ...arr].slice(0, 300));
    return doc;
  }

  function exportAll() {
    return {
      users: getUsers(),
      settings: readSettings(),
      cleaning: getList("log:cleaning"),
      repair: getList("log:repair"),
      community: getList("log:community"),
    };
  }

  function download(filename, text, type="application/json") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href:url, download:filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 400);
  }

  /* ----------------------------- Boot ----------------------------- */
  // Apply appearance on load
  const settings = readSettings();
  applyAppearance(settings);

  // Public API
  window.APP = {
    // ui
    toast: showToast,

    // settings
    settings: { get: readSettings, set: writeSettings, apply: applyAppearance, defaults: SETTINGS_DEFAULTS },

    // auth
    auth: { login, logout, register, currentUser },

    // store
    store: {
      getUsers, setUsers,
      getList, setList,
      submitCleaning, submitRepair, submitMessage,
      exportAll, download
    },

    // utils
    utils: { qs, qsa, events }
  };
})();
