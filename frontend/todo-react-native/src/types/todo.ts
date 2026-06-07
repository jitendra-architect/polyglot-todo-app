export type TodoStatus = 'todo' | 'doing' | 'done';

export interface Todo {
  _id: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: TodoStatus;
  priority: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface TodoListResult {
  items: Todo[];
  total: number;
  page: number;
  limit: number;
}

export interface ListTodosParams {
  page?: number;
  limit?: number;
  status?: TodoStatus | 'all';
}

export interface CreateTodoPayload {
  title: string;
  description?: string;
  dueDate?: string;
  status?: TodoStatus;
  priority?: number;
}

export interface UpdateTodoPayload {
  title?: string;
  description?: string;
  dueDate?: string;
  status?: TodoStatus;
  priority?: number;
  __v?: number;
}
