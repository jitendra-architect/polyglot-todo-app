import { Schema, model, Document, Types } from 'mongoose';

export enum TodoStatus {
  TODO = 'todo',
  DOING = 'doing',
  DONE = 'done',
}

export interface ITodo {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  dueDate?: Date;
  status: TodoStatus;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export type TodoDocument = ITodo & Document;

const TodoSchema = new Schema<ITodo>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: Object.values(TodoStatus),
      default: TodoStatus.TODO,
    },
    priority: { type: Number, min: 1, max: 5, default: 3 },
  },
  {
    timestamps: true,
    versionKey: '__v',
    optimisticConcurrency: true,
  },
);

TodoSchema.index({ status: 1, dueDate: 1 });

export const TodoModel = model<ITodo>('Todo', TodoSchema);
