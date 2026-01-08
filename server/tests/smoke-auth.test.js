import request from 'supertest';
import app from '../index.js';
import { cleanupUser, closeDbConnection } from './testUtils.js';

describe('Smoke: registration and login', () => {
  const username = `smoke_${Date.now()}`;
  const email = `smoke_${Date.now()}@example.com`;
  const password = 'smokepass123';
  const role = 'resident';
  let agent;
  let userId;

  test(
    'registers and logs in',
    async () => {
      agent = request.agent(app);
      const registerRes = await agent.post('/api/auth/register').send({ username, password, email, role });
      expect(registerRes.statusCode).toBe(201);
      userId = registerRes.body.user.id;
      expect(registerRes.body.user).toHaveProperty('role', role);

      const loginRes = await agent.post('/api/auth/login').send({ username, password, role });
      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.user).toHaveProperty('username', username.toLowerCase());
    },
    20000,
  );

  afterAll(async () => {
    await cleanupUser(userId);
    await closeDbConnection();
  });
});
