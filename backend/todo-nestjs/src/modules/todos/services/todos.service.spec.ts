import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { TodosService } from './todos.service';
import { Todo, TodoSchema } from '../schemas/todo.schema';
import { JobsModule } from '../../../jobs/jobs.module';
import { CreateTodoDto } from '../dtos/create-todo.dto';
import { TodoStatus } from '../schemas/todo.schema';

describe('TodosService', () => {
  let service: TodosService;
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    process.env.REDIS_ENABLED = 'false';
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: Todo.name, schema: TodoSchema }]),
        JobsModule
      ],
      providers: [TodosService]
    }).compile();

    service = moduleRef.get(TodosService);
  });

  afterAll(async () => {
    await moduleRef.close();
    await mongod.stop();
  });

  it('creates and lists todos', async () => {
    const dto: CreateTodoDto = { title: 'unit test', priority: 2, status: TodoStatus.TODO };
    const created = await service.create(dto);
    expect(created.title).toBe('unit test');

    const list = await service.findAll({ page: 1, limit: 10 });
    expect(list.total).toBe(1);
    expect(list.items[0].title).toBe('unit test');
  });
});
