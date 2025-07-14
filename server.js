require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const bcrypt     = require('bcrypt');
const session    = require('express-session');
const MongoStore = require('connect-mongo');
const cors       = require('cors');

const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5500',  // adjust to your front-end URL
  credentials: true
}));

// MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'));

// User model
const userSchema = new mongoose.Schema({
  email:    { type: String, unique: true },
  password: String,
  role:     String
});
const User = mongoose.model('User', userSchema);

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// Register
app.post('/api/register', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role)
    return res.status(400).json({ message: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await new User({ email, password: hash, role }).save();
    res.json({ message: 'User registered' });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: 'Email already in use' });
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role)
    return res.status(400).json({ message: 'Missing fields' });
  const user = await User.findOne({ email, role });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
  req.session.userId = user._id;
  res.json({ email: user.email, role: user.role });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

// Current user
app.get('/api/user', async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = await User.findById(req.session.userId).select('email role');
  res.json({ user });
});

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
