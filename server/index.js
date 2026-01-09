import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { pingDb } from './mysql.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const uploadsRoot = path.join(root, 'uploads');
const repairUploadDir = path.join(uploadsRoot, 'repairs');
[
  path.join(root, '.env'),
  path.join(root, '.env.production'),
  path.join(__dirname, '.env'),
  path.join(__dirname, '.env.production'),
].forEach((envPath) => dotenv.config({ path: envPath, override: false }));

let models;
const useMemory = process.env.USE_INMEMORY_DB === 'true';
if (useMemory) {
  ({ models } = await import('./models/memoryModels.js'));
  console.warn('⚠️  Using in-memory data store (USE_INMEMORY_DB=true). Data will reset on restart.');
} else {
  try {
    ({ models } = await import('./models/sqlModels.js'));
  } catch (err) {
    console.error('Failed to connect to MySQL. Falling back to in-memory store.', err.message);
    ({ models } = await import('./models/memoryModels.js'));
    console.warn('⚠️  Using in-memory data store because MySQL connection failed.');
  }
}

let bcrypt;
try {
  ({ default: bcrypt } = await import('bcryptjs'));
} catch (err) {
  console.warn('⚠️  bcryptjs not available. Falling back to crypto SHA-256 hashes (not secure for production).');
  bcrypt = {
    async hash(value) {
      return crypto.createHash('sha256').update(String(value)).digest('hex');
    },
    async compare(plain, hashed) {
      const h = await this.hash(plain);
      return h === hashed;
    },
  };
}

const { User, Request, CommunityPost, Session, PasswordResetToken, Notification, AuditLog } = models;
const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me';
const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'sid';
const CSRF_COOKIE = process.env.CSRF_COOKIE_NAME || 'csrfToken';
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 24 * 7);
const TRUST_PROXY = Number(process.env.TRUST_PROXY || 1);
const FORCE_HTTPS = process.env.FORCE_HTTPS !== 'false';
const SECURE_COOKIES = process.env.SECURE_COOKIES
  ? process.env.SECURE_COOKIES !== 'false'
  : (isProd && FORCE_HTTPS);
const RESET_WINDOW_MS = Number(process.env.RESET_WINDOW_MS || 1000 * 60 * 15);
const APP_BASE_URL = process.env.APP_BASE_URL || (isProd ? process.env.APP_URL || '' : 'http://localhost:5000');

if (!process.env.SESSION_SECRET) {
  console.warn('⚠️  SESSION_SECRET not set. Using fallback "change-me" secret. Configure a strong SESSION_SECRET in production.');
}

await seedDemoUsers();

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: SECURE_COOKIES,
  maxAge: SESSION_TTL_MS,
  path: '/',
};
const csrfCookieOptions = {
  httpOnly: false,
  sameSite: 'strict',
  secure: SECURE_COOKIES,
  maxAge: SESSION_TTL_MS,
  path: '/',
};
const parseList = (value, fallback = []) => (value ? value.split(',').map((v) => v.trim()).filter(Boolean) : fallback);
const connectHosts = ["'self'", ...parseList(process.env.CSP_CONNECT_SRC)];
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
  imgSrc: ["'self'", 'data:', 'https:'],
  fontSrc: ["'self'", 'data:', 'https:'],
  connectSrc: connectHosts,
  frameAncestors: ["'none'"],
  objectSrc: ["'none'"],
  upgradeInsecureRequests: isProd ? [] : undefined,
};
const randomToken = (size = 32) => crypto.randomBytes(size).toString('hex');
const hashToken = (token) => crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
const minutes = (ms) => Math.round(ms / 60000);
const REQUEST_STATUSES = new Set(['open', 'in_progress', 'done']);

const sendEmail = async (to, subject, body) => {
  if (!to) {
    console.warn(`[email] Missing recipient. Subject: ${subject}\n${body}`);
    return;
  }
  console.log(`\n📧 EMAIL to ${to}\nSubject: ${subject}\n${body}\n`);
};
const sendSms = async (to, message) => {
  if (!to) {
    console.warn(`[sms] Missing phone number. Message: ${message}`);
    return;
  }
  console.log(`\n📱 SMS to ${to}\n${message}\n`);
};

const ensureRepairUploadDir = async () => {
  await fs.mkdir(repairUploadDir, { recursive: true });
};

const saveRepairPhotos = async (photos = []) => {
  if (!Array.isArray(photos) || !photos.length) return [];
  await ensureRepairUploadDir();
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const saved = [];
  for (const item of photos.slice(0, 4)) {
    const dataUrl = item?.data || item?.dataUrl || '';
    if (typeof dataUrl !== 'string') continue;
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) continue;
    const [, mime, b64] = match;
    if (!allowed.has(mime)) continue;
    const buffer = Buffer.from(b64, 'base64');
    if (buffer.length > 2 * 1024 * 1024) continue;
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const name = `${Date.now()}-${randomToken(6)}.${ext}`;
    const target = path.join(repairUploadDir, name);
    await fs.writeFile(target, buffer);
    saved.push(`/uploads/repairs/${name}`);
  }
  return saved;
};

const recordAudit = async (event, { userId = null, severity = 'info', metadata = {} } = {}, req = null) => {
  try {
    const ipAddress = req?.ip || null;
    const userAgent = req?.headers?.['user-agent'] ? req.headers['user-agent'].slice(0, 500) : null;
    await AuditLog.create({ userId, event, severity, ipAddress, userAgent, metadata });
  } catch (err) {
    console.error('Failed to write audit log', err);
  }
};

const createNotification = async (userId, { type, title, body = '', metadata = {} } = {}) => {
  try {
    if (!userId || !type || !title) return;
    await Notification.create({ userId, type, title, body, metadata });
  } catch (err) {
    console.error('Failed to create notification', err);
  }
};

const mapNotification = (n) => {
  let metadata = n.metadata || {};
  if (typeof metadata === 'string') {
    try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
  }
  return {
    id: n.id,
    userId: n.user_id || n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    metadata,
    readAt: n.read_at || n.readAt || null,
    createdAt: n.created_at || n.createdAt || null,
  };
};

async function issuePasswordReset(user) {
  await PasswordResetToken.deleteExpired();
  const token = randomToken(32);
  const delivery = user.contact?.phone ? 'sms' : 'email';
  const expiresAt = new Date(Date.now() + RESET_WINDOW_MS);
  await PasswordResetToken.create({
    userId: user.id,
    tokenHash: hashToken(token),
    delivery,
    expiresAt,
  });
  const linkBase = APP_BASE_URL ? APP_BASE_URL.replace(/\/$/, '') : '';
  const link = linkBase ? `${linkBase}/reset.html?token=${token}` : token;
  const msg = `Use reset code ${token} to update your password. This expires in ${minutes(RESET_WINDOW_MS)} minutes.${linkBase ? `\nReset link: ${link}` : ''}`;
  if (delivery === 'sms') await sendSms(user.contact?.phone, msg);
  else await sendEmail(user.contact?.email || user.email, 'Password reset instructions', msg);
}

app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY);
app.use(helmet({
  contentSecurityPolicy: isProd ? { directives: cspDirectives } : false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'no-referrer' },
  hsts: isProd ? { maxAge: 60 * 60 * 24 * 365, preload: true } : false,
}));
if (isProd && FORCE_HTTPS) {
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') return next();
    if (req.method === 'GET' || req.method === 'HEAD') {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    return res.status(403).send('HTTPS required');
  });
}
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '5mb' }));
app.use(express.static(root, { index: false }));
app.use('/uploads', express.static(path.join(root, 'uploads')));

const rateBuckets = new Map();
const rateLimit = (max = 100, windowMs = 60_000, keyFn = (req) => req.ip) => (req, res, next) => {
  const now = Date.now();
  const key = keyFn(req) || req.ip;
  const bucket = rateBuckets.get(key) || { count: 0, reset: now + windowMs };
  if (now > bucket.reset) {
    bucket.count = 0;
    bucket.reset = now + windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (bucket.count > max) return res.status(429).json({ error: 'Too many requests, slow down.' });
  next();
};
const apiLimiter = rateLimit(Number(process.env.RATE_LIMIT_MAX || 600), Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000));
app.use('/api', apiLimiter);

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(';').reduce((acc, cur) => {
    const [k, v] = cur.trim().split('=');
    acc[k] = decodeURIComponent(v || '');
    return acc;
  }, {});
}
const READONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

async function getActiveSession(req) {
  if (req.sessionRecord) return req.sessionRecord;
  const sid = parseCookies(req)[SESSION_COOKIE];
  if (!sid) return null;
  const session = await Session.findBySid(sid);
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt && session.expiresAt.getTime() <= now) {
    await Session.deleteOne({ sid });
    return null;
  }
  const nextExpiry = new Date(now + SESSION_TTL_MS);
  await Session.touch(sid, nextExpiry);
  const hydrated = { ...session, sid };
  req.sessionRecord = hydrated;
  return hydrated;
}

async function setSession(req, res, userId) {
  const sid = randomToken(48);
  const csrfToken = randomToken(48);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await Session.create({
    sid,
    userId,
    csrfDigest: hashToken(csrfToken),
    expiresAt,
    ipAddress: req.ip,
    userAgent: (req.headers['user-agent'] || '').slice(0, 500),
  });
  res.cookie(SESSION_COOKIE, sid, sessionCookieOptions);
  res.cookie(CSRF_COOKIE, csrfToken, csrfCookieOptions);
}

async function rotateCsrfToken(req, res, sessionRecord = null) {
  const session = sessionRecord || await getActiveSession(req);
  if (!session) throw new Error('No active session to rotate CSRF token for.');
  const csrfToken = randomToken(48);
  await Session.updateCsrf(session.sid, hashToken(csrfToken));
  res.cookie(CSRF_COOKIE, csrfToken, csrfCookieOptions);
  return csrfToken;
}

async function clearSession(req, res) {
  const sid = parseCookies(req)[SESSION_COOKIE];
  if (sid) await Session.deleteOne({ sid });
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
  req.sessionRecord = null;
}

async function getUserFromReq(req) {
  const session = await getActiveSession(req);
  if (!session) return null;
  const user = await User.findById(session.userId);
  if (!user) {
    await Session.deleteOne({ sid: session.sid });
    return null;
  }
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

const csrfRequired = asyncHandler(async (req, res, next) => {
  if (READONLY_METHODS.has(req.method)) return next();
  const token = req.get('x-csrf-token') || req.get('x-xsrf-token') || req.body?._csrf;
  if (!token) return res.status(403).json({ error: 'Missing CSRF token' });
  const session = req.sessionRecord || await getActiveSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const digest = hashToken(token);
  if (digest !== session.csrfDigest) return res.status(403).json({ error: 'Invalid CSRF token' });
  next();
});

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!roles.includes(req.user.role)) {
    recordAudit('auth.role.denied', {
      userId: req.user.id,
      severity: 'warn',
      metadata: { route: req.originalUrl, method: req.method, requiredRoles: roles, role: req.user.role },
    }, req);
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

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
  const normalizedUsername = (username || '').trim().toLowerCase();
  const normalizedEmail = (email || '').trim().toLowerCase();
  const normalizedRole = (role || '').trim().toLowerCase();
  const allowedRoles = new Set(['resident', 'landlord']);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  if (!normalizedUsername || normalizedUsername.length < 3) {
    return res.status(400).json({ error: 'Username too short' });
  }
  if (!normalizedEmail || !emailOk) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  if (!allowedRoles.has(normalizedRole)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password too short' });
  }
  const existing = await User.findOne({ username: normalizedUsername });
  if (existing) return res.status(409).json({ error: 'Username already taken' });
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    username: normalizedUsername,
    email: normalizedEmail,
    role: normalizedRole,
    passwordHash: hash,
    profile: { displayName: username },
    contact: { email: normalizedEmail },
  });
  await setSession(req, res, user.id);
  await recordAudit('auth.register', { userId: user.id, metadata: { username: normalizedUsername, role: user.role } }, req);
  res.status(201).json({ user: publicUser(user) });
}));

const loginRateKey = (req) => {
  const user = (req.body?.username || '').toLowerCase().trim();
  return `${req.ip}:${user || 'unknown'}`;
};

app.post('/api/auth/login', rateLimit(60, 60_000, loginRateKey), asyncHandler(async (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const normalizedUsername = username.toLowerCase();
  const user = await User.findOne({ username: normalizedUsername });
  if (!user) {
    await recordAudit('auth.login.invalid', { metadata: { username: normalizedUsername, reason: 'unknown_user' }, severity: 'warn' }, req);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    await recordAudit('auth.login.invalid', { userId: user.id, metadata: { username: normalizedUsername, reason: 'bad_password' }, severity: 'warn' }, req);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  await setSession(req, res, user.id);
  await recordAudit('auth.login.success', { userId: user.id }, req);
  res.json({ user: publicUser(user) });
}));

app.get('/api/auth/me', authRequired, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post('/api/auth/logout', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  await clearSession(req, res);
  await recordAudit('auth.logout', { userId: req.user.id }, req);
  res.json({ ok: true });
}));
app.post('/api/auth/logout-all', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  await Session.deleteMany({ userId: req.user.id });
  await clearSession(req, res);
  await recordAudit('auth.logout_all', { userId: req.user.id, severity: 'warn' }, req);
  res.json({ ok: true });
}));

app.get('/api/auth/sessions', authRequired, asyncHandler(async (req, res) => {
  const sessions = await Session.findByUserId(req.user.id);
  const currentSid = req.sessionRecord?.sid;
  res.json({
    sessions: sessions.map((s) => ({
      sid: s.sid,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastSeen: s.lastSeen,
      expiresAt: s.expiresAt,
      current: s.sid === currentSid
    }))
  });
}));

app.post('/api/auth/sessions/revoke', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  const { sid = '' } = req.body || {};
  if (!sid) return res.status(400).json({ error: 'Session id required' });
  if (sid === req.sessionRecord?.sid) {
    await clearSession(req, res);
    await recordAudit('auth.session.revoked', { userId: req.user.id, metadata: { sid, current: true } }, req);
    return res.json({ ok: true, current: true });
  }
  await Session.deleteOne({ sid });
  await recordAudit('auth.session.revoked', { userId: req.user.id, metadata: { sid } }, req);
  res.json({ ok: true });
}));

app.post('/api/auth/change-password', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  const { currentPassword = '', newPassword = '' } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  const ok = await bcrypt.compare(currentPassword, req.user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Incorrect current password' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password too short' });
  req.user.passwordHash = await bcrypt.hash(newPassword, 10);
  await req.user.save();
  await recordAudit('auth.password.changed', { userId: req.user.id }, req);
  res.json({ ok: true });
}));

const resetRateKey = (req) => {
  const email = (req.body?.email || '').toLowerCase().trim();
  const user = (req.body?.username || '').toLowerCase().trim();
  return `${req.ip}:${email || user || 'unknown'}`;
};

app.post('/api/auth/request-reset', rateLimit(20, 60_000, resetRateKey), asyncHandler(async (req, res) => {
  const { email = '', username = '' } = req.body || {};
  const emailTrim = email.trim();
  const usernameTrim = username.trim().toLowerCase();
  let user = null;
  if (emailTrim) user = await User.findOne({ email: emailTrim });
  if (!user && usernameTrim) user = await User.findOne({ username: usernameTrim });
  if (user) {
    await issuePasswordReset(user);
    await recordAudit('auth.reset.requested', { userId: user.id, metadata: { via: emailTrim ? 'email' : 'username' } }, req);
  } else {
    await recordAudit('auth.reset.requested', { metadata: { username: usernameTrim || null, email: emailTrim || null, matched: false } }, req);
  }
  res.json({ ok: true });
}));

app.post('/api/auth/reset', rateLimit(40, 60_000), asyncHandler(async (req, res) => {
  const { token = '', password = '' } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  await PasswordResetToken.deleteExpired();
  const tokenHash = hashToken(token);
  const record = await PasswordResetToken.findByTokenHash(tokenHash);
  if (!record || record.used) return res.status(400).json({ error: 'Invalid or expired token' });
  if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
    await PasswordResetToken.markUsed(record.id);
    return res.status(400).json({ error: 'Reset token has expired' });
  }
  const user = await User.findById(record.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  await PasswordResetToken.markUsed(record.id);
  await recordAudit('auth.reset.completed', { userId: user.id }, req);
  res.json({ ok: true });
}));

app.get('/api/security/csrf', authRequired, asyncHandler(async (req, res) => {
  const token = await rotateCsrfToken(req, res, req.sessionRecord);
  res.json({ token });
}));

app.get('/api/security/audit', authRequired, requireRole('landlord'), asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 10), 500);
  const logs = await AuditLog.findRecent(limit);
  res.json({ logs });
}));

app.get('/api/notifications', authRequired, asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 40, 5), 200);
  const unreadOnly = String(req.query.unread || '').toLowerCase() === 'true';
  const list = await Notification.findByUserId(req.user.id, { limit, unreadOnly });
  res.json({ notifications: list.map(mapNotification) });
}));

app.post('/api/notifications/read', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  await Notification.markRead(req.user.id, ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)));
  res.json({ ok: true });
}));

app.post('/api/notifications/read-all', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  await Notification.markAllRead(req.user.id);
  res.json({ ok: true });
}));

app.get('/api/health', asyncHandler(async (req, res) => {
  let dbOk = false;
  try {
    dbOk = await pingDb();
  } catch {
    dbOk = false;
  }
  res.json({ ok: true, db: dbOk, time: new Date().toISOString() });
}));

// Profile & settings
app.post('/api/profile/about', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  const { displayName = '', unit = '', bio = '' } = req.body || {};
  req.user.profile.displayName = displayName || req.user.username;
  req.user.profile.unit = unit;
  req.user.profile.bio = bio;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
}));
app.post('/api/profile/contact', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  const { email = '', phone = '', preferred = 'email' } = req.body || {};
  req.user.contact.email = email;
  req.user.contact.phone = phone;
  req.user.contact.preferred = preferred;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
}));
app.post('/api/profile/prefs', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  const { emailUpdates = false, communityVisible = true } = req.body || {};
  req.user.prefs.emailUpdates = !!emailUpdates;
  req.user.prefs.communityVisible = !!communityVisible;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
}));
app.post('/api/settings', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  req.user.settings = req.body || {};
  await req.user.save();
  res.json({ ok: true });
}));
app.get('/api/profile/activity', authRequired, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userReqs = await Request.find({ userId });
  const userPosts = await CommunityPost.find({ userId });
  const notifications = await Notification.findByUserId(userId, { limit: 20 });
  res.json({ requests: userReqs, posts: userPosts, notifications: notifications.map(mapNotification) });
}));

app.post('/api/forms/cleaning', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  const { name = req.user.username, address = '', date = '', type = '' } = req.body || {};
  const err = requireFields({ address, date, type }, { address: { min: 3 }, date: { min: 2 }, type: { min: 2 } });
  if (err) return res.status(400).json({ error: err });
  const rec = await Request.create({ userId: req.user.id, type: 'cleaning', name, address, date, cleaningType: type, status: 'open', statusUpdatedAt: new Date() });
  req.user.stats.requests = (req.user.stats.requests || 0) + 1;
  await req.user.save();
  await createNotification(req.user.id, {
    type: 'request_created',
    title: 'Cleaning request submitted',
    body: `${type} • ${address}`,
    metadata: { requestId: rec.id, requestType: 'cleaning' }
  });
  const landlords = await User.findAll({ role: 'landlord' });
  await Promise.all(landlords.map((l) => createNotification(l.id, {
    type: 'request_created',
    title: 'New cleaning request',
    body: `${name} • ${address}`,
    metadata: { requestId: rec.id, requestType: 'cleaning' }
  })));
  res.status(201).json(rec);
}));
app.post('/api/forms/repairs', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  const { name = req.user.username, address = '', issue = '', photos = [] } = req.body || {};
  const err = requireFields({ address, issue }, { address: { min: 3 }, issue: { min: 3 } });
  if (err) return res.status(400).json({ error: err });
  const savedPhotos = await saveRepairPhotos(Array.isArray(photos) ? photos : []);
  const rec = await Request.create({ userId: req.user.id, type: 'repair', name, address, issue, status: 'open', statusUpdatedAt: new Date(), photos: savedPhotos });
  req.user.stats.requests = (req.user.stats.requests || 0) + 1;
  await req.user.save();
  await createNotification(req.user.id, {
    type: 'request_created',
    title: 'Repair request submitted',
    body: issue.slice(0, 140),
    metadata: { requestId: rec.id, requestType: 'repair' }
  });
  const landlords = await User.findAll({ role: 'landlord' });
  await Promise.all(landlords.map((l) => createNotification(l.id, {
    type: 'request_created',
    title: 'New repair request',
    body: `${name} • ${address}`,
    metadata: { requestId: rec.id, requestType: 'repair' }
  })));
  res.status(201).json(rec);
}));
app.post('/api/forms/message', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  const { message = '' } = req.body || {};
  const rec = await Request.create({ userId: req.user.id, type: 'message', name: req.user.username, message });
  const landlords = await User.findAll({ role: 'landlord' });
  await Promise.all(landlords.map((l) => createNotification(l.id, {
    type: 'community_post',
    title: 'New community message',
    body: message.slice(0, 140),
    metadata: { requestId: rec.id, requestType: 'message' }
  })));
  res.status(201).json(rec);
}));
app.get('/api/requests', authRequired, asyncHandler(async (req, res) => {
  const list = req.user.role === 'landlord'
    ? await Request.find()
    : await Request.find({ userId: req.user.id });
  if (req.user.role !== 'landlord') {
    await recordAudit('requests.view.self', { userId: req.user.id }, req);
  }
  res.json(list);
}));

app.post('/api/requests/:id/status', authRequired, requireRole('landlord'), csrfRequired, asyncHandler(async (req, res) => {
  const { status = '' } = req.body || {};
  const normalized = String(status || '').toLowerCase().trim();
  if (!REQUEST_STATUSES.has(normalized)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const updated = await Request.updateStatus(req.params.id, normalized);
  if (!updated) return res.status(404).json({ error: 'Request not found' });
  await createNotification(updated.userId, {
    type: 'request_status',
    title: 'Request status updated',
    body: `Your ${updated.type} request is now ${normalized.replace('_', ' ')}.`,
    metadata: { requestId: updated.id, status: normalized }
  });
  await recordAudit('requests.status.updated', { userId: req.user.id, metadata: { requestId: updated.id, status: normalized } }, req);
  res.json(updated);
}));

app.get('/api/community', authRequired, asyncHandler(async (req, res) => {
  const list = await CommunityPost.find();
  res.json(list);
}));
app.post('/api/community', authRequired, csrfRequired, asyncHandler(async (req, res) => {
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
  const landlords = await User.findAll({ role: 'landlord' });
  await Promise.all(landlords.map((l) => createNotification(l.id, {
    type: 'community_post',
    title: 'New community post',
    body: message.slice(0, 140),
    metadata: { postId: post.id }
  })));
  res.status(201).json(post);
}));
app.post('/api/community/:id/comments', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const { message = '' } = req.body || {};
  if (!message.trim()) return res.status(400).json({ error: 'Message required' });
  post.comments.unshift({ author: req.user.profile?.displayName || req.user.username, message });
  await post.save();
  if (post.userId && post.userId !== req.user.id) {
    await createNotification(post.userId, {
      type: 'community_comment',
      title: 'New comment on your post',
      body: message.slice(0, 140),
      metadata: { postId: post.id }
    });
  }
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
app.get('/reset', (req, res) => send(res, 'reset.html'));

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
    { username: 'resident123', role: 'resident', email: 'resident@example.com', phone: '+15551112222', password: 'resident123' },
    { username: 'landlord123', role: 'landlord', email: 'landlord@example.com', phone: '+15552223333', password: 'landlord123' },
  ];
  for (const d of demo) {
    const hash = await bcrypt.hash(d.password, 10);
    await User.create({
      username: d.username,
      email: d.email,
      role: d.role,
      passwordHash: hash,
      profile: { displayName: d.username },
      contact: { email: d.email, phone: d.phone },
    });
  }
}
