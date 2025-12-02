import { db } from '../mysql.js';

export async function cleanupUser(userId) {
  if (!userId) return;
  try {
    await db.query('DELETE FROM requests WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM community_posts WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM sessions WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
  } catch (e) {
    console.error('cleanupUser error', e.message || e);
  }
}
import { db } from '../mysql.js';

export async function cleanupUser(userId) {
  if (!userId) return;
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
