import app from '../index.js';
import { closeDbConnection, createTestAgent } from './testUtils.js';

describe('Auth endpoints', () => {
  const username = `testuser_${Date.now()}`;
  const password = 'testpass123';
  const email = `testuser_${Date.now()}@example.com`;
  const role = 'resident';
  let agent;
  let closeServer;

  beforeAll(async () => {
    const setup = await createTestAgent(app);
    agent = setup.agent;
    closeServer = setup.close;
  });

  test(
    'registers a new user',
    async () => {
      const res = await agent.post('/api/auth/register').send({ username, password, email, role });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('username', username.toLowerCase());
    },
    20000,
  );

  test(
    'logs in the user',
    async () => {
      const res = await agent.post('/api/auth/login').send({ username, password, role });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('username', username.toLowerCase());
    },
    20000,
  );

  afterAll(async () => {
    if (closeServer) {
      await closeServer();
    }
    await closeDbConnection();
  });
});
