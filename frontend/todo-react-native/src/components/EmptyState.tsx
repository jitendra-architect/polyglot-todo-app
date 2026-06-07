import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  filtered?: boolean;
}

export function EmptyState({ filtered }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📋</Text>
      <Text style={styles.title}>
        {filtered ? 'No todos match this filter' : 'No todos yet'}
      </Text>
      <Text style={styles.subtitle}>
        {filtered
          ? 'Try a different status filter.'
          : 'Tap the + button to add your first todo.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 8,
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
});
