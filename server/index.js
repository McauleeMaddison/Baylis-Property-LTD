import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
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

const { User, Request, CommunityPost, Session, PasswordResetToken, OtpChallenge, AuditLog } = models;
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
const OTP_WINDOW_MS = Number(process.env.OTP_WINDOW_MS || 1000 * 60 * 5);
const RESET_WINDOW_MS = Number(process.env.RESET_WINDOW_MS || 1000 * 60 * 15);
const MAX_OTP_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const REQUIRE_2FA = process.env.REQUIRE_2FA !== 'false';
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
const hashOtpCode = (challengeId, code) => hashToken(`${challengeId}:${code}`);
const minutes = (ms) => Math.round(ms / 60000);

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

const recordAudit = async (event, { userId = null, severity = 'info', metadata = {} } = {}, req = null) => {
  try {
    const ipAddress = req?.ip || null;
    const userAgent = req?.headers?.['user-agent'] ? req.headers['user-agent'].slice(0, 500) : null;
    await AuditLog.create({ userId, event, severity, ipAddress, userAgent, metadata });
  } catch (err) {
    console.error('Failed to write audit log', err);
  }
};

const requiresTwoFactor = (user) => {
  const pref = user.settings?.security?.twoFactorEnabled;
  if (typeof pref === 'boolean') return pref;
  return REQUIRE_2FA;
};

async function issueOtpChallenge(user, context = 'login') {
  await OtpChallenge.deleteExpired();
  const challengeId = randomToken(24);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const delivery = user.contact?.phone ? 'sms' : 'email';
  const expiresAt = new Date(Date.now() + OTP_WINDOW_MS);
  await OtpChallenge.create({
    userId: user.id,
    challengeId,
    codeHash: hashOtpCode(challengeId, code),
    delivery,
    context,
    expiresAt,
  });
  const msg = `Your Baylis verification code is ${code}. It expires in ${minutes(OTP_WINDOW_MS)} minutes.`;
  if (delivery === 'sms') await sendSms(user.contact?.phone, msg);
  else await sendEmail(user.contact?.email || user.email, 'Your verification code', msg);
  return { challengeId, delivery, context };
}

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

app.post('/api/auth/login', rateLimit(60, 60_000), asyncHandler(async (req, res) => {
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
  if (requiresTwoFactor(user)) {
    const challenge = await issueOtpChallenge(user, 'login');
    await recordAudit('auth.login.otp_required', { userId: user.id, metadata: { delivery: challenge.delivery } }, req);
    return res.json({ require2FA: true, challengeId: challenge.challengeId, delivery: challenge.delivery });
  }
  await setSession(req, res, user.id);
  await recordAudit('auth.login.success', { userId: user.id, metadata: { twoFactor: false } }, req);
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

app.post('/api/auth/request-reset', rateLimit(20, 60_000), asyncHandler(async (req, res) => {
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

app.post('/api/auth/verify-otp', rateLimit(40, 60_000), asyncHandler(async (req, res) => {
  const { challengeId = '', code = '' } = req.body || {};
  if (!challengeId || !code) return res.status(400).json({ error: 'Challenge and code are required' });
  const challenge = await OtpChallenge.findByChallengeId(challengeId);
  if (!challenge) {
    await recordAudit('auth.otp.invalid', { metadata: { reason: 'missing_challenge' }, severity: 'warn' }, req);
    return res.status(400).json({ error: 'Challenge expired or invalid' });
  }
  if (challenge.expiresAt && challenge.expiresAt.getTime() <= Date.now()) {
    await OtpChallenge.delete(challengeId);
    await recordAudit('auth.otp.invalid', { userId: challenge.userId, metadata: { reason: 'expired', context: challenge.context }, severity: 'warn' }, req);
    return res.status(400).json({ error: 'Code expired' });
  }
  if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
    await OtpChallenge.delete(challengeId);
    await recordAudit('auth.otp.invalid', { userId: challenge.userId, metadata: { reason: 'max_attempts', context: challenge.context }, severity: 'error' }, req);
    return res.status(429).json({ error: 'Too many attempts. Please log in again.' });
  }
  const matches = hashOtpCode(challenge.challengeId, code) === challenge.codeHash;
  if (!matches) {
    await OtpChallenge.incrementAttempts(challengeId);
    await recordAudit('auth.otp.invalid', { userId: challenge.userId, metadata: { reason: 'bad_code', attempts: challenge.attempts + 1, context: challenge.context }, severity: 'warn' }, req);
    return res.status(401).json({ error: 'Invalid verification code' });
  }
  await OtpChallenge.delete(challengeId);
  const user = await User.findById(challenge.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (challenge.context === 'login') {
    await setSession(req, res, user.id);
    await recordAudit('auth.login.success', { userId: user.id, metadata: { twoFactor: true } }, req);
    return res.json({ user: publicUser(user) });
  }
  if (challenge.context === '2fa-enable') {
    user.settings = user.settings || {};
    user.settings.security = { ...(user.settings.security || {}), twoFactorEnabled: true };
    await user.save();
    await recordAudit('auth.2fa.enabled', { userId: user.id }, req);
    return res.json({ ok: true, twoFactorEnabled: true });
  }
  if (challenge.context === '2fa-disable') {
    user.settings = user.settings || {};
    user.settings.security = { ...(user.settings.security || {}), twoFactorEnabled: false };
    await user.save();
    await recordAudit('auth.2fa.disabled', { userId: user.id, severity: 'warn' }, req);
    return res.json({ ok: true, twoFactorEnabled: false });
  }
  await recordAudit('auth.otp.verified', { userId: user.id, metadata: { context: challenge.context } }, req);
  res.json({ ok: true });
}));

app.post('/api/auth/resend-otp', rateLimit(20, 60_000), asyncHandler(async (req, res) => {
  const { challengeId = '' } = req.body || {};
  if (!challengeId) return res.status(400).json({ error: 'Challenge is required' });
  const challenge = await OtpChallenge.findByChallengeId(challengeId);
  if (!challenge) return res.status(404).json({ error: 'Challenge expired or invalid' });
  const user = await User.findById(challenge.userId);
  if (!user) {
    await OtpChallenge.delete(challengeId);
    return res.status(404).json({ error: 'User not found' });
  }
  await OtpChallenge.delete(challengeId);
  const fresh = await issueOtpChallenge(user, challenge.context || 'login');
  await recordAudit('auth.otp.resent', { userId: user.id, metadata: { context: fresh.context, delivery: fresh.delivery } }, req);
  res.json({ challengeId: fresh.challengeId, delivery: fresh.delivery, context: fresh.context });
}));

app.post('/api/auth/twofactor/setup', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  const alreadyEnabled = !!req.user.settings?.security?.twoFactorEnabled;
  if (alreadyEnabled) return res.status(400).json({ error: 'Two-factor is already enabled' });
  const challenge = await issueOtpChallenge(req.user, '2fa-enable');
  await recordAudit('auth.2fa.challenge', { userId: req.user.id, metadata: { action: 'enable', delivery: challenge.delivery } }, req);
  res.json({ challengeId: challenge.challengeId, delivery: challenge.delivery });
}));

app.post('/api/auth/twofactor/disable', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  if (REQUIRE_2FA) return res.status(400).json({ error: 'Two-factor cannot be disabled in this environment' });
  const enabled = !!req.user.settings?.security?.twoFactorEnabled;
  if (!enabled) return res.status(400).json({ error: 'Two-factor is not enabled' });
  const challenge = await issueOtpChallenge(req.user, '2fa-disable');
  await recordAudit('auth.2fa.challenge', { userId: req.user.id, metadata: { action: 'disable', delivery: challenge.delivery } }, req);
  res.json({ challengeId: challenge.challengeId, delivery: challenge.delivery });
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
  res.json({ requests: userReqs, posts: userPosts });
}));

app.post('/api/forms/cleaning', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  const { name = req.user.username, address = '', date = '', type = '' } = req.body || {};
  const err = requireFields({ address, date, type }, { address: { min: 3 }, date: { min: 2 }, type: { min: 2 } });
  if (err) return res.status(400).json({ error: err });
  const rec = await Request.create({ userId: req.user.id, type: 'cleaning', name, address, date, cleaningType: type });
  req.user.stats.requests = (req.user.stats.requests || 0) + 1;
  await req.user.save();
  res.status(201).json(rec);
}));
app.post('/api/forms/repairs', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  const { name = req.user.username, address = '', issue = '' } = req.body || {};
  const err = requireFields({ address, issue }, { address: { min: 3 }, issue: { min: 3 } });
  if (err) return res.status(400).json({ error: err });
  const rec = await Request.create({ userId: req.user.id, type: 'repair', name, address, issue });
  req.user.stats.requests = (req.user.stats.requests || 0) + 1;
  await req.user.save();
  res.status(201).json(rec);
}));
app.post('/api/forms/message', authRequired, csrfRequired, asyncHandler(async (req, res) => {
  const { message = '' } = req.body || {};
  const rec = await Request.create({ userId: req.user.id, type: 'message', name: req.user.username, message });
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
  res.status(201).json(post);
}));
app.post('/api/community/:id/comments', authRequired, csrfRequired, asyncHandler(async (req, res) => {
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
