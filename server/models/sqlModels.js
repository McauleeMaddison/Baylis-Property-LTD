import { db } from '../mysql.js';

function parseJSONField(v) {
  if (v === null || v === undefined) return {};
  try { return typeof v === 'object' ? v : JSON.parse(v); } catch (e) { return {}; }
}

async function rowToUser(row) {
  if (!row) return null;
  const user = {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    passwordHash: row.passwordHash,
    profile: parseJSONField(row.profile),
    contact: parseJSONField(row.contact),
    prefs: parseJSONField(row.prefs),
    settings: parseJSONField(row.settings),
    stats: parseJSONField(row.stats),
    toObject() { return { ...this }; },
    async save() {
      await db.query(
        `UPDATE users SET email = ?, passwordHash = ?, role = ?, profile = ?, contact = ?, prefs = ?, settings = ?, stats = ? WHERE id = ?`,
        [this.email, this.passwordHash, this.role, JSON.stringify(this.profile || {}), JSON.stringify(this.contact || {}), JSON.stringify(this.prefs || {}), JSON.stringify(this.settings || {}), JSON.stringify(this.stats || {}), this.id]
      );
      return this;
    }
  };
  return user;
}

export const User = {
  async findOne(filter = {}) {
    if (filter.username) {
      const [rows] = await db.query('SELECT * FROM users WHERE username = ? LIMIT 1', [filter.username.toLowerCase()]);
      return rowToUser(rows[0]);
    }
    if (filter.email) {
      const [rows] = await db.query('SELECT * FROM users WHERE email = ? LIMIT 1', [filter.email]);
      return rowToUser(rows[0]);
    }
    return null;
  },
  async findById(id) {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rowToUser(rows[0]);
  },
  async create(data) {
    const profile = JSON.stringify(data.profile || {});
    const contact = JSON.stringify(data.contact || {});
    const prefs = JSON.stringify(data.prefs || {});
    const settings = JSON.stringify(data.settings || {});
    const stats = JSON.stringify(data.stats || {});
    const [result] = await db.query(`INSERT INTO users (username, email, role, passwordHash, profile, contact, prefs, settings, stats) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.username.toLowerCase(), data.email || '', data.role || 'resident', data.passwordHash || data.password || '', profile, contact, prefs, settings, stats]);
    const id = result.insertId;
    const [rows] = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rowToUser(rows[0]);
  }
};

const mapRequestRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  type: r.type,
  name: r.name,
  address: r.address,
  issue: r.issue,
  cleaningType: r.cleaning_type,
  date: r.date,
  message: r.message,
  createdAt: r.created_at
});

export const Request = {
  async create(data) {
    const [result] = await db.query(`INSERT INTO requests (user_id, type, name, address, issue, cleaning_type, date, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.userId, data.type, data.name || '', data.address || '', data.issue || '', data.cleaningType || '', data.date || '', data.message || '']);
    const [rows] = await db.query('SELECT * FROM requests WHERE id = ? LIMIT 1', [result.insertId]);
    return mapRequestRow(rows[0]);
  },
  async find(filter = {}) {
    if (filter.userId) {
      const [rows] = await db.query('SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC', [filter.userId]);
      return rows.map(mapRequestRow);
    }
    const [rows] = await db.query('SELECT * FROM requests ORDER BY created_at DESC');
    return rows.map(mapRequestRow);
  }
};

const mapPostRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  title: r.title,
  message: r.message,
  author: r.author,
  pinned: !!r.pinned,
  likes: r.likes || 0,
  comments: parseJSONField(r.comments) || [],
  createdAt: r.created_at,
  async save() {
    await db.query('UPDATE community_posts SET comments = ?, likes = ?, pinned = ? WHERE id = ?', [JSON.stringify(this.comments || []), this.likes || 0, this.pinned ? 1 : 0, this.id]);
    return this;
  }
});

export const CommunityPost = {
  async find(filter = {}) {
    if (filter.userId) {
      const [rows] = await db.query('SELECT * FROM community_posts WHERE user_id = ? ORDER BY created_at DESC', [filter.userId]);
      return rows.map(mapPostRow);
    }
    const [rows] = await db.query('SELECT * FROM community_posts ORDER BY created_at DESC');
    return rows.map(mapPostRow);
  },
  async create(data) {
    const [result] = await db.query(`INSERT INTO community_posts (user_id, title, message, author, pinned, likes, comments) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.userId, data.title || '', data.message || '', data.author || '', data.pinned ? 1 : 0, data.likes || 0, JSON.stringify(data.comments || [])]);
    const [rows] = await db.query('SELECT * FROM community_posts WHERE id = ? LIMIT 1', [result.insertId]);
    return mapPostRow(rows[0]);
  },
  async findById(id) {
    const [rows] = await db.query('SELECT * FROM community_posts WHERE id = ? LIMIT 1', [id]);
    return mapPostRow(rows[0]);
  }
};

export const Session = {
  async create(data) {
    await db.query('INSERT INTO sessions (sid, user_id) VALUES (?, ?)', [data.sid, data.userId]);
    return { sid: data.sid, userId: data.userId };
  },
  async deleteOne(filter = {}) {
    if (filter.sid) await db.query('DELETE FROM sessions WHERE sid = ?', [filter.sid]);
  },
  async deleteMany(filter = {}) {
    if (filter.userId) await db.query('DELETE FROM sessions WHERE user_id = ?', [filter.userId]);
  },
  async findOne(filter = {}) {
    if (filter.sid) {
      const [rows] = await db.query('SELECT * FROM sessions WHERE sid = ? LIMIT 1', [filter.sid]);
      const r = rows[0];
      if (!r) return null;
      return { sid: r.sid, userId: r.user_id };
    }
    return null;
  }
};

export const models = { User, Request, CommunityPost, Session };
