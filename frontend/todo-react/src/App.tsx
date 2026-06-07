import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { TodoCard } from './components/TodoCard';
import { TodoCardSkeleton } from './components/TodoCardSkeleton';
import { TodoForm } from './components/TodoForm';
import { TodoFilters } from './components/TodoFilters';
import { Pagination } from './components/Pagination';
import { EmptyState } from './components/EmptyState';
import { ConfirmDialog } from './components/ConfirmDialog';
import {
  useTodoList,
  useCreateTodo,
  useUpdateTodo,
  useDeleteTodo,
} from './hooks/useTodos';
import type { Todo, TodoStatus, CreateTodoPayload, UpdateTodoPayload } from './types/todo';

type Filter = TodoStatus | 'all';

const PAGE_LIMIT = 9;

export default function App() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);

  const listParams = {
    page,
    limit: PAGE_LIMIT,
    status: filter,
  };

  const { data, isLoading, isError, isFetching, refetch } = useTodoList(listParams);
  const createMutation = useCreateTodo();
  const updateMutation = useUpdateTodo();
  const deleteMutation = useDeleteTodo();

  const totalPages = data ? Math.ceil(data.total / PAGE_LIMIT) : 1;

  function handleFilterChange(f: Filter) {
    setFilter(f);
    setPage(1);
  }

  function handleEdit(todo: Todo) {
    setEditingTodo(todo);
    setFormOpen(true);
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditingTodo(null);
  }

  function handleFormSubmit(values: CreateTodoPayload & { __v?: number }) {
    if (editingTodo) {
      const payload: UpdateTodoPayload = {
        title: values.title,
        description: values.description,
        dueDate: values.dueDate,
        status: values.status,
        priority: values.priority,
        __v: values.__v,
      };
      updateMutation.mutate(
        { id: editingTodo._id, payload },
        { onSuccess: handleFormClose },
      );
    } else {
      const payload: CreateTodoPayload = {
        title: values.title,
        description: values.description,
        dueDate: values.dueDate,
        status: values.status,
        priority: values.priority,
      };
      createMutation.mutate(payload, { onSuccess: handleFormClose });
    }
  }

  function handleDeleteConfirm() {
    if (!deletingTodo) return;
    deleteMutation.mutate(deletingTodo._id, {
      onSuccess: () => setDeletingTodo(null),
    });
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Todo App</h1>
            <p className="text-xs text-slate-400 mt-0.5">Stay on top of your tasks</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => { setEditingTodo(null); setFormOpen(true); }}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} />
              New Todo
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Stats strip */}
        {data && (
          <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <span className="text-sm text-slate-500">
              <span className="font-semibold text-slate-800">{data.total}</span> total todos
            </span>
            <span className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="text-sm text-slate-500">
              Page <span className="font-semibold text-slate-800">{data.page}</span> of{' '}
              <span className="font-semibold text-slate-800">{totalPages}</span>
            </span>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6">
          <TodoFilters value={filter} onChange={handleFilterChange} />
        </div>

        {/* Error */}
        {isError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load todos.{' '}
            <button onClick={() => refetch()} className="font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PAGE_LIMIT }, (_, i) => (
              <TodoCardSkeleton key={i} />
            ))}
          </div>
        ) : data && data.items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((todo) => (
              <TodoCard
                key={todo._id}
                todo={todo}
                onEdit={handleEdit}
                onDelete={setDeletingTodo}
                isDeleting={deleteMutation.isPending && deletingTodo?._id === todo._id}
              />
            ))}
          </div>
        ) : (
          !isError && <EmptyState filtered={filter !== 'all'} />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </main>

      {/* Modals */}
      {formOpen && (
        <TodoForm
          todo={editingTodo}
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {deletingTodo && (
        <ConfirmDialog
          title="Delete Todo"
          message={`Are you sure you want to delete "${deletingTodo.title}"? This action cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingTodo(null)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
