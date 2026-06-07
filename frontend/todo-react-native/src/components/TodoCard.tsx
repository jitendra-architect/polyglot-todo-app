import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Todo } from '../types/todo';
import { StatusBadge } from './StatusBadge';
import { PriorityDots } from './PriorityDots';

interface Props {
  todo: Todo;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isPastDue(dateStr?: string, status?: string) {
  if (!dateStr || status === 'done') return false;
  return new Date(dateStr) < new Date();
}

export function TodoCard({ todo, onEdit, onDelete }: Props) {
  const pastDue = isPastDue(todo.dueDate, todo.status);
  const formattedDate = formatDate(todo.dueDate);
  const isDone = todo.status === 'done';

  return (
    <View style={[styles.card, isDone && styles.cardDone]}>
      {/* Title row */}
      <View style={styles.headerRow}>
        <Text
          style={[styles.title, isDone && styles.titleDone]}
          numberOfLines={2}
        >
          {todo.title}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => onEdit(todo)}
            style={[styles.actionBtn, styles.editBtn]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.editBtnText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(todo)}
            style={[styles.actionBtn, styles.deleteBtn]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteBtnText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Description */}
      {todo.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {todo.description}
        </Text>
      ) : null}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <StatusBadge status={todo.status} />
          <PriorityDots value={todo.priority} />
        </View>
        {formattedDate ? (
          <Text style={[styles.dueDate, pastDue && styles.dueDatePast]}>
            📅 {formattedDate}
            {pastDue ? ' (overdue)' : ''}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 10,
  },
  cardDone: {
    opacity: 0.65,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 22,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    backgroundColor: '#f8fafc',
  },
  editBtnText: {
    fontSize: 14,
  },
  deleteBtn: {
    backgroundColor: '#fff5f5',
  },
  deleteBtnText: {
    fontSize: 14,
  },
  description: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dueDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  dueDatePast: {
    color: '#ef4444',
  },
});
