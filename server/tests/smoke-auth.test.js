import request from 'supertest';
import app from '../index.js';
import { cleanupUser, closeDbConnection } from './testUtils.js';

describe('Smoke: registration and login', () => {
  const password = 'smokepass123';
  let agent;
  let userIds = [];

  test(
    'registers and logs in for resident and landlord',
    async () => {
      agent = request.agent(app);
      const roles = ['resident', 'landlord'];
      for (const role of roles) {
        const stamp = Date.now();
        const username = `smoke_${role}_${stamp}`;
        const email = `smoke_${role}_${stamp}@example.com`;
        const registerRes = await agent.post('/api/auth/register').send({ username, password, email, role });
        expect(registerRes.statusCode).toBe(201);
        userIds.push(registerRes.body.user.id);
        expect(registerRes.body.user).toHaveProperty('role', role);

        const loginRes = await agent.post('/api/auth/login').send({ username, password, role });
        expect(loginRes.statusCode).toBe(200);
        expect(loginRes.body.user).toHaveProperty('username', username.toLowerCase());
      }
    },
    20000,
  );

  afterAll(async () => {
    for (const id of userIds) {
      await cleanupUser(id);
    }
    await closeDbConnection();
  });
});
