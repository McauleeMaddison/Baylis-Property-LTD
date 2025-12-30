import request from 'supertest';
import app from '../index.js';
import { cleanupUser, authedPost, closeDbConnection } from './testUtils.js';

describe('Integration: profile, community, requests', () => {
  const username = `itest_${Date.now()}`;
  const password = 'testpass123';
  let agent;
  let userId;

  beforeAll(async () => {
    agent = request.agent(app);
    const res = await agent.post('/api/auth/register').send({ username, password });
    expect(res.statusCode).toBe(201);
    userId = res.body.user.id;
  }, 20000);

  test(
    'update profile about',
    async () => {
      const res = await authedPost(agent, '/api/profile/about', { displayName: 'New Name', unit: '1A', bio: 'Hello' });
      expect(res.statusCode).toBe(200);
      expect(res.body.user.profile.displayName).toBe('New Name');
    },
    10000,
  );

  test(
    'create community post and comment',
    async () => {
      const res = await authedPost(agent, '/api/community', { title: 'Hello', message: 'This is a test' });
      expect(res.statusCode).toBe(201);
      const postId = res.body.id;
      const commentRes = await authedPost(agent, `/api/community/${postId}/comments`, { message: 'Nice post' });
      expect(commentRes.statusCode).toBe(201);
    },
    15000,
  );

  test(
    'create a cleaning request and fetch requests',
    async () => {
      const res = await authedPost(agent, '/api/forms/cleaning', { address: '123 Road', date: '2025-12-02', type: 'regular' });
      expect(res.statusCode).toBe(201);
      const listRes = await agent.get('/api/requests');
      expect(listRes.statusCode).toBe(200);
      expect(Array.isArray(listRes.body)).toBe(true);
    },
    15000,
  );

  afterAll(async () => {
    await cleanupUser(userId);
    await closeDbConnection();
  });
});
