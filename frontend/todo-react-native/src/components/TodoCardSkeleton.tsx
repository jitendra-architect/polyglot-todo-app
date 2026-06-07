import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

function SkeletonBox({ style }: { style?: object }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[{ backgroundColor: '#e2e8f0', opacity }, style]} />;
}

export function TodoCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <SkeletonBox style={{ height: 16, borderRadius: 8, flex: 0.65 }} />
        <View style={styles.actions}>
          <SkeletonBox style={{ width: 32, height: 32, borderRadius: 8 }} />
          <SkeletonBox style={{ width: 32, height: 32, borderRadius: 8 }} />
        </View>
      </View>
      <SkeletonBox style={{ height: 12, borderRadius: 6, width: '100%' }} />
      <SkeletonBox style={{ height: 12, borderRadius: 6, width: '75%' }} />
      <View style={styles.footer}>
        <SkeletonBox style={{ height: 22, borderRadius: 999, width: 60 }} />
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <SkeletonBox key={i} style={{ width: 8, height: 8, borderRadius: 4 }} />
          ))}
        </View>
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
    gap: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
