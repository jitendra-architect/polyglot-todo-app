import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Todo, TodoStatus } from '../types/todo';

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  status: z.enum(['todo', 'doing', 'done']),
  priority: z
    .string()
    .or(z.number())
    .transform((v) => Number(v))
    .pipe(z.number().min(1, 'Min 1').max(5, 'Max 5')),
});

type FormValues = {
  title: string;
  description?: string;
  dueDate?: string;
  status: TodoStatus;
  priority: number;
};

interface Props {
  visible: boolean;
  todo?: Todo | null;
  onClose: () => void;
  onSubmit: (values: FormValues & { __v?: number }) => void;
  isSubmitting?: boolean;
}

const STATUS_OPTIONS: { value: TodoStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'To Do', color: '#6366f1' },
  { value: 'doing', label: 'Doing', color: '#3b82f6' },
  { value: 'done', label: 'Done', color: '#22c55e' },
];

function toDateValue(dateStr?: string) {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

export function TodoFormModal({ visible, todo, onClose, onSubmit, isSubmitting }: Props) {
  const isEditing = Boolean(todo);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues, unknown, FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { title: '', description: '', dueDate: '', status: 'todo', priority: 3 },
  });

  useEffect(() => {
    if (visible) {
      if (todo) {
        reset({
          title: todo.title,
          description: todo.description ?? '',
          dueDate: toDateValue(todo.dueDate),
          status: todo.status,
          priority: todo.priority,
        });
      } else {
        reset({ title: '', description: '', dueDate: '', status: 'todo', priority: 3 });
      }
    }
  }, [visible, todo, reset]);

  const submit = (values: FormValues) => {
    const payload: FormValues & { __v?: number } = {
      ...values,
      description: values.description || undefined,
      dueDate: values.dueDate || undefined,
    };
    if (isEditing && todo) payload.__v = todo.__v;
    onSubmit(payload);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.cancelHeaderBtn}>
              <Text style={styles.cancelHeaderText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isEditing ? 'Edit Todo' : 'New Todo'}</Text>
            <TouchableOpacity
              onPress={handleSubmit(submit)}
              style={[styles.saveHeaderBtn, isSubmitting && styles.disabledBtn]}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveHeaderText}>{isEditing ? 'Save' : 'Create'}</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Title <Text style={styles.required}>*</Text>
              </Text>
              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, errors.title && styles.inputError]}
                    placeholder="What needs to be done?"
                    placeholderTextColor="#94a3b8"
                    value={value}
                    onChangeText={onChange}
                    autoFocus={!isEditing}
                  />
                )}
              />
              {errors.title && <Text style={styles.errorText}>{errors.title.message}</Text>}
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="Add more details..."
                    placeholderTextColor="#94a3b8"
                    value={value}
                    onChangeText={onChange}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                )}
              />
            </View>

            {/* Status */}
            <View style={styles.field}>
              <Text style={styles.label}>Status</Text>
              <Controller
                control={control}
                name="status"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.segmentRow}>
                    {STATUS_OPTIONS.map((opt) => {
                      const active = value === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.segment,
                            active && { backgroundColor: opt.color, borderColor: opt.color },
                          ]}
                          onPress={() => onChange(opt.value)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />
            </View>

            {/* Priority */}
            <View style={styles.field}>
              <Text style={styles.label}>Priority (1 = lowest, 5 = highest)</Text>
              <Controller
                control={control}
                name="priority"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.priorityRow}>
                    {[1, 2, 3, 4, 5].map((p) => {
                      const active = Number(value) === p;
                      const color = p >= 4 ? '#ef4444' : p === 3 ? '#f59e0b' : '#22c55e';
                      return (
                        <TouchableOpacity
                          key={p}
                          onPress={() => onChange(p)}
                          style={[
                            styles.priorityBtn,
                            active && { backgroundColor: color, borderColor: color },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.priorityBtnText, active && styles.priorityBtnActive]}>
                            {p}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />
              {errors.priority && (
                <Text style={styles.errorText}>{String(errors.priority.message)}</Text>
              )}
            </View>

            {/* Due Date */}
            <View style={styles.field}>
              <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
              <Controller
                control={control}
                name="dueDate"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, errors.dueDate && styles.inputError]}
                    placeholder="2026-12-31"
                    placeholderTextColor="#94a3b8"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="numbers-and-punctuation"
                  />
                )}
              />
              {errors.dueDate && <Text style={styles.errorText}>{errors.dueDate.message}</Text>}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  cancelHeaderBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  cancelHeaderText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  saveHeaderBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  saveHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  body: {
    padding: 20,
    gap: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
  },
  textarea: {
    minHeight: 80,
    paddingTop: 12,
  },
  inputError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 2,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  priorityBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
  },
  priorityBtnActive: {
    color: '#ffffff',
  },
});
