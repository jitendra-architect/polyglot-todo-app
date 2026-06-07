import axios from 'axios';
import { API_BASE_URL } from '../constants/api';
import type {
  Todo,
  TodoListResult,
  ListTodosParams,
  CreateTodoPayload,
  UpdateTodoPayload,
} from '../types/todo';

const http = axios.create({ baseURL: API_BASE_URL });

export const todosApi = {
  list(params: ListTodosParams): Promise<TodoListResult> {
    const query: Record<string, string | number> = {};
    if (params.page) query.page = params.page;
    if (params.limit) query.limit = params.limit;
    if (params.status && params.status !== 'all') query.status = params.status;
    return http.get<TodoListResult>('/todos', { params: query }).then((r) => r.data);
  },

  get(id: string): Promise<Todo> {
    return http.get<Todo>(`/todos/${id}`).then((r) => r.data);
  },

  create(payload: CreateTodoPayload): Promise<Todo> {
    return http.post<Todo>('/todos', payload).then((r) => r.data);
  },

  update(id: string, payload: UpdateTodoPayload): Promise<Todo> {
    return http.put<Todo>(`/todos/${id}`, payload).then((r) => r.data);
  },

  remove(id: string): Promise<{ status: 'ok' }> {
    return http.delete<{ status: 'ok' }>(`/todos/${id}`).then((r) => r.data);
  },
};
