import 'dotenv/config';
import { config } from './config/configuration';
import { connectMongo, disconnectMongo } from './db/mongoose';
import { connectPostgres, disconnectPostgres } from './db/postgres';
import { MongoTodosRepository } from './modules/todos/repository/mongo-todos.repository';
import { PostgresTodosRepository } from './modules/todos/repository/postgres-todos.repository';
import { ITodosRepository } from './modules/todos/repository/todos-repository.interface';
import { createApp } from './app';
import { logger } from './common/logger';

async function bootstrap() {
  let todosRepo: ITodosRepository;

  if (config.db.profile === 'postgresql') {
    await connectPostgres(config.postgresql.uri);
    todosRepo = new PostgresTodosRepository();
  } else {
    await connectMongo(config.mongodb.uri);
    todosRepo = new MongoTodosRepository();
  }

  const { app, queue } = createApp(config, todosRepo);
  await queue.start();

  const server = app.listen(config.port, () => {
    logger.info(`Server running on http://localhost:${config.port} [${config.env}]`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await queue.stop();
      if (config.db.profile === 'postgresql') {
        await disconnectPostgres();
      } else {
        await disconnectMongo();
      }
      process.exit(0);
    });
    // Force exit after 10s if graceful shutdown stalls
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Fatal bootstrap error', { err });
  process.exit(1);
});
