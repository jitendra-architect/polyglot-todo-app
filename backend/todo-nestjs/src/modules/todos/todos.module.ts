import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TodosService } from './services/todos.service';
import { Todo, TodoSchema } from './schemas/todo.schema';
import { TodosApiController } from './controllers/todos.api.controller';
import { TodosViewController } from './controllers/todos.view.controller';
import { JobsModule } from '../../jobs/jobs.module';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Todo.name,
        useFactory: () => {
          const schema = TodoSchema;
          return schema;
        }
      }
    ]),
    JobsModule
  ],
  controllers: [TodosApiController, TodosViewController],
  providers: [TodosService],
  exports: [TodosService]
})
export class TodosModule {}


