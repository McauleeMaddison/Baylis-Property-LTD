// server.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');

const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB
mongoose.connect('mongodb://localhost:27017/baylis-auth', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ DB connection error:', err));

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'keyboard-cat',
  resave: false,
  saveUninitialized: false,
}));

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views/form.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views/register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views/login.html')));

// Handle form submission
app.post('/submit-form', (req, res) => {
  console.log('Form Data:', req.body);
  res.send('Form received!');
});

// Handle registration
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.send('User already exists.');
  const hash = await bcrypt.hash(password, 10);
  await User.create({ email, password: hash });
  res.send('✅ Registered successfully.');
});

// Handle login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.send('❌ User not found.');
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.send('❌ Incorrect password.');
  req.session.user = user;
  res.send('✅ Logged in successfully.');
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
