import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { TodosService } from './todos.service';
import { TodosRepository } from '../repository/todos.repository';
import { TodoQueueService } from '../../../services/todo-queue.service';
import { TodoStatus } from '../schemas/todo.model';
import { NotFoundError, ConflictError } from '../../../common/errors/http-error';
import type { Config } from '../../../config/configuration';

// Minimal no-op config (Redis disabled)
const mockConfig: Config = {
  env: 'test',
  port: 3001,
  mongodb: { uri: '' },
  redis: { enabled: false, url: '', host: '127.0.0.1', port: 6379 },
  cache: { ttlSeconds: 30 },
};

describe('TodosService', () => {
  let mongod: MongoMemoryServer;
  let service: TodosService;
  let repo: TodosRepository;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    repo = new TodosRepository();
    service = new TodosService(repo, new TodoQueueService(mockConfig));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
  });

  // ── create ─────────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('creates a todo with defaults', async () => {
      const todo = await service.create({ title: 'Buy milk', status: TodoStatus.TODO, priority: 3 });
      expect(todo.title).toBe('Buy milk');
      expect(todo.status).toBe(TodoStatus.TODO);
      expect(todo.priority).toBe(3);
      expect(todo._id).toBeDefined();
    });

    it('creates a todo with all fields', async () => {
      const todo = await service.create({
        title: 'Full todo',
        description: 'desc',
        dueDate: '2027-01-01',
        status: TodoStatus.DOING,
        priority: 5,
      });
      expect(todo.description).toBe('desc');
      expect(todo.status).toBe(TodoStatus.DOING);
      expect(todo.priority).toBe(5);
      expect(todo.dueDate).toBeInstanceOf(Date);
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('returns empty list when no todos', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('paginates correctly', async () => {
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          service.create({ title: `Todo ${i}`, status: TodoStatus.TODO, priority: 3 }),
        ),
      );
      const page1 = await service.findAll({ page: 1, limit: 3 });
      expect(page1.total).toBe(5);
      expect(page1.items).toHaveLength(3);

      const page2 = await service.findAll({ page: 2, limit: 3 });
      expect(page2.items).toHaveLength(2);
    });

    it('filters by status', async () => {
      await service.create({ title: 'Todo A', status: TodoStatus.TODO, priority: 1 });
      await service.create({ title: 'Done B', status: TodoStatus.DONE, priority: 1 });

      const todos = await service.findAll({ page: 1, limit: 10, status: TodoStatus.TODO });
      expect(todos.total).toBe(1);
      expect(todos.items[0].status).toBe(TodoStatus.TODO);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('returns a todo by id', async () => {
      const created = await service.create({ title: 'Find me', status: TodoStatus.TODO, priority: 2 });
      const found = await service.findOne(created._id.toString());
      expect(found.title).toBe('Find me');
    });

    it('throws NotFoundError for unknown id', async () => {
      await expect(service.findOne('000000000000000000000001')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('updates fields', async () => {
      const created = await service.create({ title: 'Original', status: TodoStatus.TODO, priority: 1 });
      const updated = await service.update(created._id.toString(), { title: 'Updated', priority: 4 });
      expect(updated.title).toBe('Updated');
      expect(updated.priority).toBe(4);
    });

    it('throws NotFoundError for unknown id', async () => {
      await expect(
        service.update('000000000000000000000001', { title: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws ConflictError on version mismatch (__v stale)', async () => {
      const created = await service.create({ title: 'Concurrent', status: TodoStatus.TODO, priority: 1 });
      // First update — increments __v to 1
      await service.update(created._id.toString(), { title: 'First' });
      // Second update with stale __v=0 — must throw ConflictError
      await expect(
        service.update(created._id.toString(), { title: 'Stale', __v: 0 }),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('deletes a todo', async () => {
      const created = await service.create({ title: 'Delete me', status: TodoStatus.TODO, priority: 1 });
      await service.remove(created._id.toString());
      await expect(service.findOne(created._id.toString())).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws NotFoundError for unknown id', async () => {
      await expect(service.remove('000000000000000000000001')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
