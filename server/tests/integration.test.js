import app from '../index.js';
import { cleanupUser, authedPost, closeDbConnection, createTestAgent } from './testUtils.js';

describe('Integration: profile, community, requests', () => {
  const username = `itest_${Date.now()}`;
  const password = 'testpass123';
  const email = `itest_${Date.now()}@example.com`;
  const role = 'resident';
  let agent;
  let userId;
  let closeServer;

  beforeAll(async () => {
    const setup = await createTestAgent(app);
    agent = setup.agent;
    closeServer = setup.close;
    const res = await agent.post('/api/auth/register').send({ username, password, email, role });
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
    'create a cleaning request for selected property and fetch requests',
    async () => {
      const propertiesRes = await agent.get('/api/properties');
      expect(propertiesRes.statusCode).toBe(200);
      expect(Array.isArray(propertiesRes.body.properties)).toBe(true);
      expect(propertiesRes.body.properties.length).toBeGreaterThan(0);
      const property = propertiesRes.body.properties.find((p) => p.id === 'crownfield-1-3') || propertiesRes.body.properties[0];

      const profileRes = await authedPost(agent, '/api/profile/property', { propertyId: property.id });
      expect(profileRes.statusCode).toBe(200);
      expect(profileRes.body.property.id).toBe(property.id);

      const res = await authedPost(agent, '/api/forms/cleaning', { propertyId: property.id, date: '2025-12-02', type: 'regular' });
      expect(res.statusCode).toBe(201);
      expect(res.body.propertyId).toBe(property.id);
      expect(res.body.propertyLabel).toBe(property.label);

      const listRes = await agent.get('/api/requests');
      expect(listRes.statusCode).toBe(200);
      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body[0].propertyId).toBe(property.id);
    },
    15000,
  );

  test(
    'resident cannot manage property catalog',
    async () => {
      const res = await authedPost(agent, '/api/properties', { label: 'Example Property, Ashford, Kent' });
      expect(res.statusCode).toBe(403);
    },
    10000,
  );

  afterAll(async () => {
    await cleanupUser(userId);
    if (closeServer) {
      await closeServer();
    }
    await closeDbConnection();
  });
});
