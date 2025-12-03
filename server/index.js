import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { models } from './models/sqlModels.js';

const { User, Request, CommunityPost, Session } = models;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

await seedDemoUsers();

app.disable('x-powered-by');
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(root, { index: false }));

const rateBuckets = new Map();
const rateLimit = (max = 100, windowMs = 60_000) => (req, res, next) => {
  const now = Date.now();
  const bucket = rateBuckets.get(req.ip) || { count: 0, reset: now + windowMs };
  if (now > bucket.reset) {
    bucket.count = 0;
    bucket.reset = now + windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(req.ip, bucket);
  if (bucket.count > max) return res.status(429).json({ error: 'Too many requests, slow down.' });
  next();
};

function uid() { return crypto.randomUUID(); }
function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(';').reduce((acc, cur) => {
    const [k, v] = cur.trim().split('=');
    acc[k] = decodeURIComponent(v || '');
    return acc;
  }, {});
}
async function setSession(res, userId) {
  const sid = uid();
  await Session.create({ sid, userId });
  res.cookie('sid', sid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
  });
}
async function clearSession(req, res) {
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  if (sid) await Session.deleteOne({ sid });
  res.clearCookie('sid');
}
async function getUserFromReq(req) {
  const sid = parseCookies(req).sid;
  if (!sid) return null;
  const sess = await Session.findOne({ sid });
  if (!sess) return null;
  const user = await User.findById(sess.userId);
  return user;
}
function publicUser(u) {
  if (!u) return null;
  const obj = u.toObject ? u.toObject() : u;
  delete obj.passwordHash;
  return obj;
}
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
const authRequired = asyncHandler(async (req, res, next) => {
  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
});

function requireFields(obj, rules) {
  for (const [field, { min = 0, required = true }] of Object.entries(rules)) {
    const val = (obj?.[field] || '').toString().trim();
    if (required && !val) return `${field} is required`;
    if (val && val.length < min) return `${field} must be at least ${min} characters`;
  }
  return '';
}

// Auth
app.post('/api/auth/register', rateLimit(30, 60_000), asyncHandler(async (req, res) => {
  const { username, email = '', role = 'resident', password = '' } = req.body || {};
  if (!username || username.length < 3) return res.status(400).json({ error: 'Username too short' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password too short' });
  const existing = await User.findOne({ username: username.toLowerCase() });
  if (existing) return res.status(409).json({ error: 'Username already taken' });
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    role: role.toLowerCase(),
    passwordHash: hash,
    profile: { displayName: username },
    contact: { email },
  });
  await setSession(res, user.id);
  res.status(201).json({ user: publicUser(user) });
}));

app.post('/api/auth/login', rateLimit(60, 60_000), asyncHandler(async (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const user = await User.findOne({ username: username.toLowerCase() });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  await setSession(res, user.id);
  res.json({ user: publicUser(user) });
}));

app.get('/api/auth/me', asyncHandler(async (req, res) => {
  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ user: publicUser(user) });
}));

app.post('/api/auth/logout', asyncHandler(async (req, res) => {
  await clearSession(req, res);
  res.json({ ok: true });
}));
app.post('/api/auth/logout-all', asyncHandler(async (req, res) => {
  const user = await getUserFromReq(req);
  if (user) await Session.deleteMany({ userId: user.id });
  await clearSession(req, res);
  res.json({ ok: true });
}));

app.post('/api/auth/change-password', authRequired, asyncHandler(async (req, res) => {
  const { currentPassword = '', newPassword = '' } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  const ok = await bcrypt.compare(currentPassword, req.user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Incorrect current password' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password too short' });
  req.user.passwordHash = await bcrypt.hash(newPassword, 10);
  await req.user.save();
  res.json({ ok: true });
}));

app.post('/api/auth/verify-otp', authRequired, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Profile & settings
app.post('/api/profile/about', authRequired, asyncHandler(async (req, res) => {
  const { displayName = '', unit = '', bio = '' } = req.body || {};
  req.user.profile.displayName = displayName || req.user.username;
  req.user.profile.unit = unit;
  req.user.profile.bio = bio;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
}));
app.post('/api/profile/contact', authRequired, asyncHandler(async (req, res) => {
  const { email = '', phone = '', preferred = 'email' } = req.body || {};
  req.user.contact.email = email;
  req.user.contact.phone = phone;
  req.user.contact.preferred = preferred;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
}));
app.post('/api/profile/prefs', authRequired, asyncHandler(async (req, res) => {
  const { emailUpdates = false, communityVisible = true } = req.body || {};
  req.user.prefs.emailUpdates = !!emailUpdates;
  req.user.prefs.communityVisible = !!communityVisible;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
}));
app.post('/api/settings', authRequired, asyncHandler(async (req, res) => {
  req.user.settings = req.body || {};
  await req.user.save();
  res.json({ ok: true });
}));
app.get('/api/profile/activity', authRequired, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userReqs = await Request.find({ userId });
  const userPosts = await CommunityPost.find({ userId });
  res.json({ requests: userReqs, posts: userPosts });
}));

app.post('/api/forms/cleaning', authRequired, asyncHandler(async (req, res) => {
  const { name = req.user.username, address = '', date = '', type = '' } = req.body || {};
  const err = requireFields({ address, date, type }, { address: { min: 3 }, date: { min: 2 }, type: { min: 2 } });
  if (err) return res.status(400).json({ error: err });
  const rec = await Request.create({ userId: req.user.id, type: 'cleaning', name, address, date, cleaningType: type });
  req.user.stats.requests = (req.user.stats.requests || 0) + 1;
  await req.user.save();
  res.status(201).json(rec);
}));
app.post('/api/forms/repairs', authRequired, asyncHandler(async (req, res) => {
  const { name = req.user.username, address = '', issue = '' } = req.body || {};
  const err = requireFields({ address, issue }, { address: { min: 3 }, issue: { min: 3 } });
  if (err) return res.status(400).json({ error: err });
  const rec = await Request.create({ userId: req.user.id, type: 'repair', name, address, issue });
  req.user.stats.requests = (req.user.stats.requests || 0) + 1;
  await req.user.save();
  res.status(201).json(rec);
}));
app.post('/api/forms/message', authRequired, asyncHandler(async (req, res) => {
  const { message = '' } = req.body || {};
  const rec = await Request.create({ userId: req.user.id, type: 'message', name: req.user.username, message });
  res.status(201).json(rec);
}));
app.get('/api/requests', authRequired, asyncHandler(async (req, res) => {
  const list = await Request.find();
  res.json(list);
}));

app.get('/api/community', authRequired, asyncHandler(async (req, res) => {
  const list = await CommunityPost.find();
  res.json(list);
}));
app.post('/api/community', authRequired, asyncHandler(async (req, res) => {
  const { title = '', message = '' } = req.body || {};
  if (!message.trim()) return res.status(400).json({ error: 'Message required' });
  const post = await CommunityPost.create({
    userId: req.user.id,
    title: title.slice(0, 120),
    message,
    author: req.user.profile?.displayName || req.user.username,
  });
  req.user.stats.posts = (req.user.stats.posts || 0) + 1;
  await req.user.save();
  res.status(201).json(post);
}));
app.post('/api/community/:id/comments', authRequired, asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const { message = '' } = req.body || {};
  if (!message.trim()) return res.status(400).json({ error: 'Message required' });
  post.comments.unshift({ author: req.user.profile?.displayName || req.user.username, message });
  await post.save();
  res.status(201).json(post.comments[0]);
}));

const send = (res, file) => res.sendFile(path.join(root, file));

app.get('/', asyncHandler(async (req, res) => {
  const user = await getUserFromReq(req);
  if (!user) return res.redirect('/login');
  if (user.role === 'landlord') return res.redirect('/landlord');
  return res.redirect('/resident');
}));
app.get('/login', (req, res) => send(res, 'login.html'));
app.get('/register', (req, res) => send(res, 'register.html'));

app.get('/resident', async (req, res) => {
  const user = await getUserFromReq(req);
  if (!user) return res.redirect('/login');
  if (user.role === 'landlord') return res.redirect('/landlord');
  return send(res, 'resident.html');
});
app.get('/landlord', async (req, res) => {
  const user = await getUserFromReq(req);
  if (!user) return res.redirect('/login');
  if (user.role !== 'landlord') return res.redirect('/resident');
  return send(res, 'landlord.html');
});

app.get('/profile', async (req, res) => {
  const user = await getUserFromReq(req);
  if (!user) return res.redirect('/login');
  return send(res, 'profile.html');
});
app.get('/settings', async (req, res) => {
  const user = await getUserFromReq(req);
  if (!user) return res.redirect('/login');
  return send(res, 'settings.html');
});

app.get('/community', (req, res) => send(res, 'community.html'));

app.get('/*.html', (req, res) => send(res, req.path.replace(/^\//, '')));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

if (process.env.NODE_ENV !== 'test') {
  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`✅ API & app server running at http://${HOST}:${PORT}`);
  });
}

export default app;

async function seedDemoUsers() {
  const existing = await User.findOne({ username: 'resident123' });
  if (existing) return;
  const demo = [
    { username: 'resident123', role: 'resident', email: 'resident@example.com', password: 'resident123' },
    { username: 'landlord123', role: 'landlord', email: 'landlord@example.com', password: 'landlord123' },
  ];
  for (const d of demo) {
    const hash = await bcrypt.hash(d.password, 10);
    await User.create({
      username: d.username,
      email: d.email,
      role: d.role,
      passwordHash: hash,
      profile: { displayName: d.username },
      contact: { email: d.email },
    });
  }
}
