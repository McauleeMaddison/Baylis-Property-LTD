import express from 'express';
import bcrypt from 'bcryptjs';
import { mongo } from './dbManager.js';

const router = express.Router();

// Register (MongoDB only)
router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const existing = await mongo.User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });
    const user = await mongo.User.create({ email, password: hash, role });
    return res.status(201).json({ email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login (MongoDB only)
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const user = await mongo.User.findOne({ email, role });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
    req.session.userId = user._id;
    return res.json({ email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

// Get current user
router.get('/user', async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = await User.findById(req.session.userId);
  res.json({ user: user ? { email: user.email, role: user.role } : null });
});

export default router;
