import { Module, Provider } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TodosService } from './services/todos.service';
import { Todo, TodoSchema } from './schemas/todo.schema';
import { TodoEntity } from './entities/todo.entity';
import { TodosApiController } from './controllers/todos.api.controller';
import { TodosViewController } from './controllers/todos.view.controller';
import { JobsModule } from '../../jobs/jobs.module';
import { TODOS_REPOSITORY } from './repository/todos-repository.interface';
import { MongoTodosRepository } from './repository/mongo-todos.repository';
import { TypeOrmTodosRepository } from './repository/typeorm-todos.repository';

const dbProfile = process.env.DB_PROFILE ?? 'mongodb';

const mongooseImports =
  dbProfile === 'postgresql'
    ? []
    : [MongooseModule.forFeatureAsync([{ name: Todo.name, useFactory: () => TodoSchema }])];

const typeOrmImports = dbProfile === 'postgresql' ? [TypeOrmModule.forFeature([TodoEntity])] : [];

const repositoryProvider: Provider =
  dbProfile === 'postgresql'
    ? { provide: TODOS_REPOSITORY, useClass: TypeOrmTodosRepository }
    : { provide: TODOS_REPOSITORY, useClass: MongoTodosRepository };

@Module({
  imports: [...mongooseImports, ...typeOrmImports, JobsModule],
  controllers: [TodosApiController, TodosViewController],
  providers: [TodosService, repositoryProvider],
  exports: [TodosService],
})
export class TodosModule {}
