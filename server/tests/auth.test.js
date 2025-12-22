import request from 'supertest';
import app from '../index.js';
import { closeDbConnection } from './testUtils.js';

describe('Auth endpoints', () => {
  const username = `testuser_${Date.now()}`;
  const password = 'testpass123';
  let server;
  let agent;

  test(
    'registers a new user',
    async () => {
      server = app.listen(0, '127.0.0.1');
      agent = request.agent(server);
      const res = await agent.post('/api/auth/register').send({ username, password });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('username', username.toLowerCase());
    },
    20000,
  );

  test(
    'logs in the user',
    async () => {
      const res = await agent.post('/api/auth/login').send({ username, password });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('username', username.toLowerCase());
    },
    20000,
  );

  afterAll(async () => {
    await closeDbConnection();
    if (server) server.close();
  });
});
