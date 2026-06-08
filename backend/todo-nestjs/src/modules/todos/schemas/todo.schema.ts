import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TodoDocument = HydratedDocument<Todo>;

export enum TodoStatus {
  TODO = 'todo',
  DOING = 'doing',
  DONE = 'done',
}

@Schema({
  timestamps: true,
  versionKey: '__v',
  optimisticConcurrency: true,
})
export class Todo {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop()
  dueDate?: Date;

  @Prop({ type: String, enum: Object.values(TodoStatus), default: TodoStatus.TODO })
  status!: TodoStatus;

  @Prop({ type: Number, min: 1, max: 5, default: 3 })
  priority!: number;
}

export const TodoSchema = SchemaFactory.createForClass(Todo);
TodoSchema.index({ status: 1, dueDate: 1 });
