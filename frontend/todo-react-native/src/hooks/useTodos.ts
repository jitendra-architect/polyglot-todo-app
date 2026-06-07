import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { todosApi } from '../api/todos';
import type {
  ListTodosParams,
  CreateTodoPayload,
  UpdateTodoPayload,
  Todo,
} from '../types/todo';

export const TODO_KEYS = {
  all: ['todos'] as const,
  lists: () => [...TODO_KEYS.all, 'list'] as const,
  list: (params: ListTodosParams) => [...TODO_KEYS.lists(), params] as const,
  detail: (id: string) => [...TODO_KEYS.all, 'detail', id] as const,
};

export function useTodoList(params: ListTodosParams) {
  return useQuery({
    queryKey: TODO_KEYS.list(params),
    queryFn: () => todosApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTodoPayload) => todosApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: TODO_KEYS.lists() }),
  });
}

export function useUpdateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTodoPayload }) =>
      todosApi.update(id, payload),
    onSuccess: (updated: Todo) => {
      qc.invalidateQueries({ queryKey: TODO_KEYS.lists() });
      qc.setQueryData(TODO_KEYS.detail(updated._id), updated);
    },
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => todosApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TODO_KEYS.lists() }),
  });
}
