import 'dotenv/config';
import { config } from './config/configuration';
import { connectMongo } from './db/mongoose';
import { createApp } from './app';
import { logger } from './common/logger';

async function bootstrap() {
  await connectMongo(config.mongodb.uri);

  const { app, queue } = createApp(config);
  await queue.start();

  const server = app.listen(config.port, () => {
    logger.info(`Server running on http://localhost:${config.port} [${config.env}]`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await queue.stop();
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
