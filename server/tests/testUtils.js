let db = null;
if (process.env.USE_INMEMORY_DB === 'true') {
  // In-memory mode for fast local/Jest runs.
  db = {
    async query() { return [[], []]; },
    async end() { /* no-op */ },
  };
} else {
  ({ db } = await import('../mysql.js'));
}

export async function getCsrfToken(agent) {
  const res = await agent.get('/api/security/csrf');
  if (res.status !== 200 || !res.body?.token) {
    throw new Error(`Failed to fetch CSRF token. Status: ${res.status}`);
  }
  return res.body.token;
}

export async function authedPost(agent, url, body = {}) {
  const token = await getCsrfToken(agent);
  return agent.post(url).set('x-csrf-token', token).send(body);
}

export async function cleanupUser(userId) {
  if (!userId || process.env.USE_INMEMORY_DB === 'true') return;
  try {
    await db.query('DELETE FROM requests WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM community_posts WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM sessions WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
  } catch (e) {
    // swallow errors in cleanup to avoid failing afterAll unexpectedly
    console.error('cleanupUser error', e.message || e);
  }
}

let dbClosed = false;
export async function closeDbConnection() {
  if (dbClosed || process.env.USE_INMEMORY_DB === 'true') return;
  dbClosed = true;
  try {
    await db.end();
  } catch (err) {
    console.error('closeDbConnection error', err.message || err);
  }
}
