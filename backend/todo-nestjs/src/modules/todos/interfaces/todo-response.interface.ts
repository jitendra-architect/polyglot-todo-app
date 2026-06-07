import { Types } from 'mongoose';
import { TodoStatus } from '../schemas/todo.schema';

export interface TodoResponse {
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

export interface TodoListResult {
  items: TodoResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface DeleteResult {
  status: 'ok';
}
