// server.js (CommonJS version)
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();

const User = require("./server/models/User"); // adjust path to your model

const app = express();

const {
  PORT = 5000,
  NODE_ENV = "development",
  SESSION_SECRET = "change-me",
  MONGODB_URI = "mongodb://127.0.0.1:27017/baylis-auth",
  CORS_ORIGIN = "http://localhost:5500"
} = process.env;

const IS_PROD = NODE_ENV === "production";

mongoose.set("strictQuery", false);
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ DB connection error:", err);
    process.exit(1);
  });

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = CORS_ORIGIN.split(",").map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
  })
);

if (!IS_PROD) app.use(morgan("dev"));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGODB_URI }),
    cookie: {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? "lax" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.use(express.static(path.join(__dirname, "public")));
const viewsDir = path.join(__dirname, "views");

app.get("/api/health", (_req, res) => res.status(200).json({ ok: true }));

app.get("/", (_req, res) => res.sendFile(path.join(viewsDir, "form.html")));
app.get("/register", (_req, res) => res.sendFile(path.join(viewsDir, "register.html")));
app.get("/login", (_req, res) => res.sendFile(path.join(viewsDir, "login.html")));

app.post("/submit-form", (req, res) => {
  console.log("Form Data:", req.body);
  res.status(200).json({ ok: true, message: "Form received" });
});

app.post("/register", async (req, res) => {
  const { email = "", password = "" } = req.body;
  if (!email || !password) return res.status(400).json({ ok: false, message: "Email and password required" });

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ ok: false, message: "User already exists" });

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hash });

  req.session.user = { id: user._id, email: user.email };
  res.status(201).json({ ok: true, user: req.session.user });
});

app.post("/login", async (req, res) => {
  const { email = "", password = "" } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ ok: false, message: "User not found" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ ok: false, message: "Incorrect password" });

  req.session.user = { id: user._id, email: user.email };
  res.status(200).json({ ok: true, user: req.session.user });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
