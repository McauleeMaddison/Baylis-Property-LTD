// Lightweight in-memory models for local/demo use when MySQL isn't available.
// Data persists only for the life of the Node process.
const state = {
  users: [],
  requests: [],
  posts: [],
  sessions: [],
  resetTokens: [],
  otpChallenges: [],
  auditLogs: [],
};

const nextId = (col) => {
  const arr = state[col];
  return arr.length ? Math.max(...arr.map((r) => r.id || 0)) + 1 : 1;
};

const clone = (obj) => JSON.parse(JSON.stringify(obj));

export const User = {
  async findOne(filter = {}) {
    if (filter.username) return state.users.find((u) => u.username === filter.username.toLowerCase()) || null;
    if (filter.email) return state.users.find((u) => u.email === filter.email) || null;
    return null;
  },
  async findById(id) {
    return state.users.find((u) => u.id === id) || null;
  },
  async create(data) {
    const user = {
      id: nextId("users"),
      username: (data.username || "").toLowerCase(),
      email: data.email || "",
      role: data.role || "resident",
      passwordHash: data.passwordHash || data.password || "",
      profile: data.profile || {},
      contact: data.contact || {},
      prefs: data.prefs || {},
      settings: data.settings || {},
      stats: data.stats || {},
      toObject() { return { ...this }; },
      async save() { return this; },
    };
    state.users.push(user);
    return user;
  },
};

export const Request = {
  async create(data) {
    const rec = {
      id: nextId("requests"),
      userId: data.userId,
      type: data.type,
      name: data.name || "",
      address: data.address || "",
      issue: data.issue || "",
      cleaningType: data.cleaningType || "",
      date: data.date || "",
      message: data.message || "",
      createdAt: new Date(),
    };
    state.requests.unshift(rec);
    return rec;
  },
  async find(filter = {}) {
    if (filter.userId) return state.requests.filter((r) => r.userId === filter.userId);
    return [...state.requests];
  },
};

export const CommunityPost = {
  async find(filter = {}) {
    const list = filter.userId ? state.posts.filter((p) => p.userId === filter.userId) : state.posts;
    return list.map(clone);
  },
  async create(data) {
    const post = {
      id: nextId("posts"),
      userId: data.userId,
      title: data.title || "",
      message: data.message || "",
      author: data.author || "",
      pinned: !!data.pinned,
      likes: data.likes || 0,
      comments: data.comments ? clone(data.comments) : [],
      createdAt: new Date(),
      async save() { return this; },
    };
    state.posts.unshift(post);
    return post;
  },
  async findById(id) {
    return state.posts.find((p) => p.id === Number(id)) || null;
  },
};

export const Session = {
  async create({ sid, userId, csrfDigest, expiresAt, ipAddress = null, userAgent = null }) {
    state.sessions.push({ sid, userId, csrfDigest, expiresAt, ipAddress, userAgent, lastSeen: new Date() });
    return { sid, userId };
  },
  async deleteOne(filter = {}) {
    if (filter.sid) state.sessions = state.sessions.filter((s) => s.sid !== filter.sid);
  },
  async deleteMany(filter = {}) {
    if (filter.userId) state.sessions = state.sessions.filter((s) => s.userId !== filter.userId);
  },
  async findBySid(sid) {
    return state.sessions.find((s) => s.sid === sid) || null;
  },
  async touch(sid, expiresAt) {
    const s = state.sessions.find((sess) => sess.sid === sid);
    if (s) { s.expiresAt = expiresAt; s.lastSeen = new Date(); }
  },
  async updateCsrf(sid, csrfDigest) {
    const s = state.sessions.find((sess) => sess.sid === sid);
    if (s) s.csrfDigest = csrfDigest;
  },
};

export const PasswordResetToken = {
  async create({ userId, tokenHash, delivery = "email", expiresAt }) {
    const rec = { id: nextId("resetTokens"), userId, tokenHash, delivery, expiresAt, used: false };
    state.resetTokens.push(rec);
    return rec.id;
  },
  async findByTokenHash(tokenHash) {
    return state.resetTokens.find((r) => r.tokenHash === tokenHash) || null;
  },
  async markUsed(id) {
    const rec = state.resetTokens.find((r) => r.id === id);
    if (rec) rec.used = true;
  },
  async deleteExpired() {
    const now = Date.now();
    state.resetTokens = state.resetTokens.filter((r) => !r.used && (!r.expiresAt || r.expiresAt.getTime() > now));
  },
};

export const OtpChallenge = {
  async create({ userId, challengeId, codeHash, delivery = "sms", context = "login", expiresAt }) {
    state.otpChallenges.push({ id: nextId("otpChallenges"), userId, challengeId, codeHash, delivery, context, expiresAt, attempts: 0 });
    return { challengeId };
  },
  async findByChallengeId(challengeId) {
    return state.otpChallenges.find((c) => c.challengeId === challengeId) || null;
  },
  async incrementAttempts(challengeId) {
    const c = state.otpChallenges.find((ch) => ch.challengeId === challengeId);
    if (c) c.attempts += 1;
  },
  async delete(challengeId) {
    state.otpChallenges = state.otpChallenges.filter((c) => c.challengeId !== challengeId);
  },
  async deleteExpired() {
    const now = Date.now();
    state.otpChallenges = state.otpChallenges.filter((c) => (c.expiresAt ? c.expiresAt.getTime() > now : true) && (c.attempts || 0) < 5);
  },
};

export const AuditLog = {
  async create({ userId = null, event, severity = "info", ipAddress = null, userAgent = null, metadata = {} }) {
    state.auditLogs.unshift({
      id: nextId("auditLogs"),
      userId,
      event,
      severity,
      ipAddress,
      userAgent,
      metadata: clone(metadata),
      createdAt: new Date(),
    });
  },
  async findRecent(limit = 100) {
    return state.auditLogs.slice(0, Math.max(1, Math.min(Number(limit) || 100, 500))).map(clone);
  },
};

export const models = { User, Request, CommunityPost, Session, PasswordResetToken, OtpChallenge, AuditLog };
