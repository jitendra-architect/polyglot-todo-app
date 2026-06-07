import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { HealthModule } from './health/health.module';
import { TodosModule } from './modules/todos/todos.module';
import { CacheModule } from './services/cache.module';
import { JobsModule } from './jobs/jobs.module';
import { TodoEntity } from './modules/todos/entities/todo.entity';

const dbProfile = process.env.DB_PROFILE ?? 'mongodb';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    ...(dbProfile === 'postgresql'
      ? []
      : [
          MongooseModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              uri: config.get<string>('mongodb.uri'),
            }),
          }),
        ]),
    ...(dbProfile === 'postgresql'
      ? [
          TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              type: 'postgres',
              url: config.get<string>('postgresql.uri'),
              entities: [TodoEntity],
              synchronize: true,
            }),
          }),
        ]
      : []),
    CacheModule,
    HealthModule,
    TodosModule,
    JobsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
