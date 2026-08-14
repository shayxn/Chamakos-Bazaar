import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Dimensions } from 'react-native';
import { useColors } from '@/hooks/useColors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

function SkeletonBox({ width: w, height: h, borderRadius = 8, style }: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const colors = useColors();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });

  return (
    <Animated.View
      style={[
        { width: w as number, height: h, borderRadius, backgroundColor: colors.border, opacity },
        style,
      ]}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <View style={{ width: CARD_WIDTH }}>
      <SkeletonBox width={CARD_WIDTH} height={CARD_WIDTH * 1.25} borderRadius={12} />
      <View style={{ paddingTop: 8, gap: 6 }}>
        <SkeletonBox width={60} height={10} />
        <SkeletonBox width={CARD_WIDTH - 20} height={13} />
        <SkeletonBox width={50} height={15} />
      </View>
    </View>
  );
}

export function ProductGridSkeleton() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </View>
  );
}
