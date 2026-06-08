import { Module } from '@nestjs/common';

import { TodoQueueService } from './todo.queue';

@Module({
  providers: [TodoQueueService],
  exports: [TodoQueueService],
})
export class JobsModule {}
