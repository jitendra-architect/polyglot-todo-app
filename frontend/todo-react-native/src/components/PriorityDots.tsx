import React from 'react';
import { View } from 'react-native';

interface Props {
  value: number;
}

function dotColor(priority: number, idx: number): string {
  if (idx >= priority) return '#e2e8f0';
  if (priority >= 4) return '#ef4444';
  if (priority === 3) return '#f59e0b';
  return '#22c55e';
}

export function PriorityDots({ value }: Props) {
  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: dotColor(value, i),
          }}
        />
      ))}
    </View>
  );
}
