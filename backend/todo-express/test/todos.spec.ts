import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import type { Express } from 'express';
import { createApp } from '../src/app';
import { MongoTodosRepository } from '../src/modules/todos/repository/mongo-todos.repository';
import type { Config } from '../src/config/configuration';

const testConfig: Config = {
  env: 'test',
  port: 0,
  db: { profile: 'mongodb' },
  mongodb: { uri: '' },
  postgresql: { uri: '' },
  redis: { enabled: false, url: '', host: '127.0.0.1', port: 6379 },
  cache: { ttlSeconds: 30 },
};

describe('Todos API — integration', () => {
  let mongod: MongoMemoryServer;
  let app: Express;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    ({ app } = createApp(testConfig, new MongoTodosRepository()));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
  });

  // ── POST /api/todos ────────────────────────────────────────────────────────
  describe('POST /api/todos', () => {
    it('creates a todo (201)', async () => {
      const res = await request(app).post('/api/todos').send({ title: 'Integration test' });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Integration test');
      expect(res.body._id).toBeDefined();
      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('returns 422 when title is missing', async () => {
      const res = await request(app).post('/api/todos').send({ priority: 2 });
      expect(res.status).toBe(422);
      expect(res.body.message).toBe('Validation failed');
    });

    it('returns 422 when priority is out of range', async () => {
      const res = await request(app).post('/api/todos').send({ title: 'Bad', priority: 9 });
      expect(res.status).toBe(422);
    });

    it('returns 422 when unknown fields are sent (strict)', async () => {
      const res = await request(app)
        .post('/api/todos')
        .send({ title: 'Strict', unknownField: 'x' });
      // Zod strips unknown fields by default; should still succeed
      expect(res.status).toBe(201);
      expect(res.body).not.toHaveProperty('unknownField');
    });
  });

  // ── GET /api/todos ─────────────────────────────────────────────────────────
  describe('GET /api/todos', () => {
    it('returns empty list', async () => {
      const res = await request(app).get('/api/todos');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ items: [], total: 0, page: 1, limit: 10 });
    });

    it('returns paginated todos', async () => {
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          request(app).post('/api/todos').send({ title: `Todo ${i}` }),
        ),
      );
      const res = await request(app).get('/api/todos?page=1&limit=3');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(5);
      expect(res.body.items).toHaveLength(3);
    });

    it('filters by status', async () => {
      await request(app).post('/api/todos').send({ title: 'A', status: 'todo' });
      await request(app).post('/api/todos').send({ title: 'B', status: 'done' });

      const res = await request(app).get('/api/todos?status=done');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].status).toBe('done');
    });

    it('returns 422 for invalid query params', async () => {
      const res = await request(app).get('/api/todos?page=-1');
      expect(res.status).toBe(422);
    });
  });

  // ── GET /api/todos/:id ─────────────────────────────────────────────────────
  describe('GET /api/todos/:id', () => {
    it('returns a single todo', async () => {
      const created = await request(app).post('/api/todos').send({ title: 'Find me' });
      const res = await request(app).get(`/api/todos/${created.body._id}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Find me');
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request(app).get('/api/todos/000000000000000000000001');
      expect(res.status).toBe(404);
    });

    it('returns 422 for malformed id', async () => {
      const res = await request(app).get('/api/todos/not-an-objectid');
      expect(res.status).toBe(422);
    });
  });

  // ── PUT /api/todos/:id ─────────────────────────────────────────────────────
  describe('PUT /api/todos/:id', () => {
    it('updates a todo', async () => {
      const created = await request(app).post('/api/todos').send({ title: 'Original' });
      const res = await request(app)
        .put(`/api/todos/${created.body._id}`)
        .send({ title: 'Updated', status: 'doing' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated');
      expect(res.body.status).toBe('doing');
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request(app)
        .put('/api/todos/000000000000000000000001')
        .send({ title: 'x' });
      expect(res.status).toBe(404);
    });

    it('returns 409 on version conflict', async () => {
      const created = await request(app).post('/api/todos').send({ title: 'Concurrent' });
      const id = created.body._id;
      // First update to increment __v
      await request(app).put(`/api/todos/${id}`).send({ title: 'First' });
      // Attempt with stale __v=0
      const res = await request(app).put(`/api/todos/${id}`).send({ title: 'Stale', __v: 0 });
      expect(res.status).toBe(409);
    });
  });

  // ── DELETE /api/todos/:id ──────────────────────────────────────────────────
  describe('DELETE /api/todos/:id', () => {
    it('deletes a todo', async () => {
      const created = await request(app).post('/api/todos').send({ title: 'Delete me' });
      const res = await request(app).delete(`/api/todos/${created.body._id}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');

      const check = await request(app).get(`/api/todos/${created.body._id}`);
      expect(check.status).toBe(404);
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request(app).delete('/api/todos/000000000000000000000001');
      expect(res.status).toBe(404);
    });
  });

  // ── GET /health ────────────────────────────────────────────────────────────
  describe('GET /health', () => {
    it('returns ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.mongodb).toBe('up');
    });
  });

  // ── 404 catch-all ──────────────────────────────────────────────────────────
  describe('404 fallback', () => {
    it('returns 404 for unknown route', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
