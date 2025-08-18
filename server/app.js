// server/app.js
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 5000;
const root = path.join(__dirname, "..");       // project root
const pub  = path.join(root, "");               // serve project root (html at root)
const assetsStatic = express.static(pub, { index: false });

app.disable("x-powered-by");
app.use(helmet());
app.use(morgan("dev"));

// Serve everything (css/js/assets/html) from root
app.use(assetsStatic);

// Helper to send a file safely
const send = (res, file) => res.sendFile(path.join(root, file));

// Map pretty routes -> files
app.get("/",        (req, res) => send(res, "index.html"));
app.get("/resident",(req, res) => send(res, "resident.html"));
app.get("/landlord",(req, res) => send(res, "landlord.html"));
app.get("/community",(req, res) => send(res, "community.html"));
app.get("/profile", (req, res) => send(res, "profile.html"));
app.get("/settings",(req, res) => send(res, "settings.html"));
app.get("/login",   (req, res) => send(res, "login.html"));
app.get("/register",(req, res) => send(res, "register.html"));

// Fallback: if it ends with .html, try to serve it
app.get("/*.html", (req, res, next) => {
  const file = req.path.replace(/^\//, "");
  return send(res, file);
});

// Final 404 (nice message)
app.use((req, res) => {
  res.status(404).send(`
    <html><head><meta charset="utf-8"><title>404</title></head>
    <body style="font-family:system-ui;padding:2rem">
      <h1>404</h1>
      <p>Nothing matches the given URI: <code>${req.originalUrl}</code></p>
      <p><a href="/">Go to Dashboard</a></p>
    </body></html>
  `);
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
