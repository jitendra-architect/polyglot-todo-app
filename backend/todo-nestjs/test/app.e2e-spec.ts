import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { CorrelationIdInterceptor } from '../src/common/interceptors/correlation-id.interceptor';

describe('App (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let uri: string;

  beforeAll(async () => {
    process.env.REDIS_ENABLED = 'false';
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true
      })
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new CorrelationIdInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('create -> list -> delete flow', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/todos')
      .send({ title: 'e2e todo', status: 'todo', priority: 3 })
      .expect(201);

    const id = createRes.body._id;
    expect(createRes.body.title).toBe('e2e todo');

    const listRes = await request(app.getHttpServer()).get('/api/todos').expect(200);
    expect(Array.isArray(listRes.body.items)).toBe(true);
    expect(listRes.body.items.some((t: any) => t._id === id)).toBe(true);

    await request(app.getHttpServer()).delete(`/api/todos/${id}`).expect(200);

    const listRes2 = await request(app.getHttpServer()).get('/api/todos').expect(200);
    expect(listRes2.body.items.some((t: any) => t._id === id)).toBe(false);
  });
});


