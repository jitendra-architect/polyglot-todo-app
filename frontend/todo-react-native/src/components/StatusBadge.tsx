import React from 'react';
import { View, Text } from 'react-native';
import type { TodoStatus } from '../types/todo';

const CONFIG: Record<TodoStatus, { label: string; bg: string; text: string; border: string }> = {
  todo: { label: 'To Do', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  doing: { label: 'Doing', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  done: { label: 'Done', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
};

interface Props {
  status: TodoStatus;
}

export function StatusBadge({ status }: Props) {
  const { label, bg, text, border } = CONFIG[status];
  return (
    <View
      style={{
        backgroundColor: bg,
        borderColor: border,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: text, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
