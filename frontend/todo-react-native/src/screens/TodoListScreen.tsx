import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { TodoCard } from '../components/TodoCard';
import { TodoCardSkeleton } from '../components/TodoCardSkeleton';
import { TodoFilters } from '../components/TodoFilters';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TodoFormModal } from './TodoFormModal';
import {
  useTodoList,
  useCreateTodo,
  useUpdateTodo,
  useDeleteTodo,
} from '../hooks/useTodos';
import type { Todo, TodoStatus, CreateTodoPayload, UpdateTodoPayload } from '../types/todo';

type Filter = TodoStatus | 'all';
const PAGE_LIMIT = 10;

export function TodoListScreen() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>('all');
  const [formVisible, setFormVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);

  const listParams = { page, limit: PAGE_LIMIT, status: filter };
  const { data, isLoading, isFetching, isError, refetch } = useTodoList(listParams);

  const createMutation = useCreateTodo();
  const updateMutation = useUpdateTodo();
  const deleteMutation = useDeleteTodo();

  const totalPages = data ? Math.ceil(data.total / PAGE_LIMIT) : 1;

  const handleFilterChange = useCallback((f: Filter) => {
    setFilter(f);
    setPage(1);
  }, []);

  const handleEdit = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setFormVisible(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormVisible(false);
    setEditingTodo(null);
  }, []);

  const handleFormSubmit = useCallback(
    (values: CreateTodoPayload & { __v?: number }) => {
      if (editingTodo) {
        const payload: UpdateTodoPayload = {
          title: values.title,
          description: values.description,
          dueDate: values.dueDate,
          status: values.status,
          priority: values.priority,
          __v: values.__v,
        };
        updateMutation.mutate({ id: editingTodo._id, payload }, { onSuccess: handleFormClose });
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
    },
    [editingTodo, createMutation, updateMutation, handleFormClose],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deletingTodo) return;
    deleteMutation.mutate(deletingTodo._id, { onSuccess: () => setDeletingTodo(null) });
  }, [deletingTodo, deleteMutation]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const renderItem = useCallback(
    ({ item }: { item: Todo }) => (
      <TodoCard todo={item} onEdit={handleEdit} onDelete={setDeletingTodo} />
    ),
    [handleEdit],
  );

  const renderHeader = () => (
    <View>
      {/* Stats strip */}
      {data && (
        <View style={styles.statsStrip}>
          <Text style={styles.statText}>
            <Text style={styles.statBold}>{data.total}</Text> todos
          </Text>
          <View style={styles.divider} />
          <Text style={styles.statText}>
            Page <Text style={styles.statBold}>{data.page}</Text> of{' '}
            <Text style={styles.statBold}>{totalPages}</Text>
          </Text>
        </View>
      )}
      {/* Filters */}
      <TodoFilters value={filter} onChange={handleFilterChange} />
    </View>
  );

  const renderFooter = () => {
    if (!data || totalPages <= 1) return null;
    return (
      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
          onPress={() => setPage((p) => p - 1)}
          disabled={page === 1}
        >
          <Text style={[styles.pageBtnText, page === 1 && styles.pageBtnTextDisabled]}>← Prev</Text>
        </TouchableOpacity>
        <Text style={styles.pageInfo}>
          {page} / {totalPages}
        </Text>
        <TouchableOpacity
          style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
          onPress={() => setPage((p) => p + 1)}
          disabled={page === totalPages}
        >
          <Text style={[styles.pageBtnText, page === totalPages && styles.pageBtnTextDisabled]}>
            Next →
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return <EmptyState filtered={filter !== 'all'} />;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Todos</Text>
          <Text style={styles.headerSubtitle}>Stay on top of your tasks</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { setEditingTodo(null); setFormVisible(true); }}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Error banner */}
      {isError && (
        <TouchableOpacity style={styles.errorBanner} onPress={() => refetch()}>
          <Text style={styles.errorBannerText}>⚠️ Failed to load todos. Tap to retry.</Text>
        </TouchableOpacity>
      )}

      {/* List */}
      {isLoading ? (
        <FlatList
          data={Array.from({ length: 6 }, (_, i) => i)}
          keyExtractor={(i) => String(i)}
          renderItem={() => <TodoCardSkeleton />}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(t) => t._id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor="#4f46e5"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Loading overlay for page changes */}
      {isFetching && !isLoading && (
        <View style={styles.fetchingIndicator}>
          <ActivityIndicator size="small" color="#4f46e5" />
        </View>
      )}

      {/* Form Modal */}
      <TodoFormModal
        visible={formVisible}
        todo={editingTodo}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        visible={Boolean(deletingTodo)}
        title="Delete Todo"
        message={`Are you sure you want to delete "${deletingTodo?.title}"? This cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingTodo(null)}
        isLoading={deleteMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  addBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    paddingBottom: 32,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statText: {
    fontSize: 13,
    color: '#64748b',
  },
  statBold: {
    fontWeight: '700',
    color: '#1e293b',
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: '#e2e8f0',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
  pageBtnTextDisabled: {
    color: '#94a3b8',
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  errorBanner: {
    margin: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorBannerText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '500',
    textAlign: 'center',
  },
  fetchingIndicator: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});
