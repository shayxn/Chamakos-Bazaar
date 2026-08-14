import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  imageUrl?: string | null;
  categoryName?: string | null;
  sellingFast?: boolean;
  spotlight?: boolean;
  isPreOrder?: boolean;
  rep?: boolean;
  onPress: () => void;
}

export function ProductCard({
  name,
  price,
  imageUrl,
  categoryName,
  sellingFast,
  spotlight,
  isPreOrder,
  rep,
  onPress,
}: ProductCardProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.imageContainer, { backgroundColor: colors.card }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.secondary }]} />
        )}
        {/* Badges */}
        <View style={styles.badgeRow}>
          {isPreOrder && (
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.badgeText, { color: colors.accentForeground }]}>PRE-ORDER</Text>
            </View>
          )}
          {sellingFast && !isPreOrder && (
            <View style={[styles.badge, { backgroundColor: '#ff3300' }]}>
              <Text style={[styles.badgeText, { color: '#fff' }]}>SELLING FAST</Text>
            </View>
          )}
          {spotlight && !isPreOrder && !sellingFast && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.badgeText, { color: '#fff' }]}>SPOTLIGHT</Text>
            </View>
          )}
          {rep && !isPreOrder && (
            <View style={[styles.badge, { backgroundColor: '#333' }]}>
              <Text style={[styles.badgeText, { color: '#999' }]}>REP</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.info}>
        {categoryName && (
          <Text style={[styles.category, { color: colors.mutedForeground }]} numberOfLines={1}>
            {categoryName.toUpperCase()}
          </Text>
        )}
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={[styles.price, { color: colors.primary }]}>
          AED {price % 1 === 0 ? price : price.toFixed(2)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
  },
  imageContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.25,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    flex: 1,
  },
  imagePlaceholder: {
    flex: 1,
  },
  badgeRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    gap: 4,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  info: {
    paddingTop: 8,
    paddingHorizontal: 2,
    gap: 2,
  },
  category: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  price: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginTop: 2,
  },
});
