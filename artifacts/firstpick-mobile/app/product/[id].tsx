import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { StatusBadge } from '@/components/StatusBadge';
import { useCart } from '@/contexts/CartContext';
import { useGetProduct } from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem } = useCart();

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  const { data: product, isLoading } = useGetProduct({ path: { id: parseInt(id, 10) } });

  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  if (isLoading || !product) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 12, backgroundColor: colors.card }]}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.card }]} />
      </View>
    );
  }

  const images = [
    product.imageUrl,
    ...(product.imageUrls ? product.imageUrls.split(',').map((u) => u.trim()) : []),
  ].filter(Boolean) as string[];

  const sizes = product.sizes
    ? product.sizes.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const hasSizes = sizes.length > 0;

  const handleAddToCart = () => {
    if (hasSizes && !selectedSize) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: images[0] ?? null,
      size: selectedSize,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Back button */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.backBtn, { top: insets.top + 12, backgroundColor: 'rgba(0,0,0,0.6)' }]}
      >
        <Feather name="arrow-left" size={20} color="#fff" />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Image gallery */}
        <FlatList
          data={images.length > 0 ? images : [null]}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ height: width * 1.2 }}
          onMomentumScrollEnd={(e) => {
            setImgIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          }}
          renderItem={({ item }) => (
            <View style={{ width, height: width * 1.2, backgroundColor: colors.card }}>
              {item ? (
                <Image source={{ uri: item }} style={{ flex: 1 }} contentFit="cover" />
              ) : (
                <View style={[styles.imagePlaceholder, { backgroundColor: colors.secondary }]}>
                  <Feather name="image" size={48} color={colors.border} />
                </View>
              )}
            </View>
          )}
        />

        {/* Dot indicator */}
        {images.length > 1 && (
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === imgIndex ? colors.primary : colors.border,
                    width: i === imgIndex ? 18 : 6,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {/* Info */}
        <View style={styles.info}>
          {product.categoryName && (
            <Text style={[styles.category, { color: colors.mutedForeground }]}>
              {product.categoryName.toUpperCase()}
            </Text>
          )}
          <Text style={[styles.name, { color: colors.foreground }]}>{product.name}</Text>
          <Text style={[styles.price, { color: colors.primary }]}>
            AED {product.price % 1 === 0 ? product.price : product.price.toFixed(2)}
          </Text>

          {/* Badges */}
          <View style={styles.badgeRow}>
            {product.isPreOrder && (
              <StatusBadge status="pending" />
            )}
            {product.sellingFast && !product.isPreOrder && (
              <View style={[styles.badge, { backgroundColor: '#1a0800' }]}>
                <Text style={[styles.badgeText, { color: '#ff6600' }]}>SELLING FAST</Text>
              </View>
            )}
            {product.rep && (
              <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>REP QUALITY</Text>
              </View>
            )}
          </View>

          {/* Sizes */}
          {hasSizes && (
            <View style={styles.sizeSection}>
              <Text style={[styles.sizeLabel, { color: colors.mutedForeground }]}>
                SIZE{selectedSize ? `: ${selectedSize}` : ' — SELECT'}
              </Text>
              <View style={styles.sizeGrid}>
                {sizes.map((sz) => (
                  <Pressable
                    key={sz}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedSize(sz === selectedSize ? null : sz);
                    }}
                    style={[
                      styles.sizeBtn,
                      {
                        backgroundColor:
                          sz === selectedSize ? colors.primary : colors.secondary,
                        borderColor:
                          sz === selectedSize ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sizeBtnText,
                        { color: sz === selectedSize ? '#fff' : colors.foreground },
                      ]}
                    >
                      {sz}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          {product.description && (
            <View style={styles.descSection}>
              <Text style={[styles.descLabel, { color: colors.mutedForeground }]}>DESCRIPTION</Text>
              <Text style={[styles.desc, { color: colors.foreground }]}>
                {product.description}
              </Text>
            </View>
          )}

          {/* Pre-order info */}
          {product.isPreOrder && product.preOrderNote && (
            <View style={[styles.preOrderCard, { backgroundColor: '#1a0a00', borderColor: '#2a1200' }]}>
              <Feather name="clock" size={16} color={colors.primary} />
              <Text style={[styles.preOrderText, { color: colors.mutedForeground }]}>
                {product.preOrderNote}
              </Text>
            </View>
          )}

          <View style={{ height: botPad + 120 }} />
        </View>
      </ScrollView>

      {/* Add to cart bar */}
      <View
        style={[
          styles.cartBar,
          { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: botPad + 16 },
        ]}
      >
        {hasSizes && !selectedSize && (
          <Text style={[styles.sizeWarning, { color: colors.primary }]}>
            Select a size to continue
          </Text>
        )}
        <Pressable
          onPress={handleAddToCart}
          style={[
            styles.addBtn,
            {
              backgroundColor:
                added
                  ? '#00cc66'
                  : hasSizes && !selectedSize
                  ? colors.secondary
                  : colors.primary,
            },
          ]}
        >
          <Feather
            name={added ? 'check' : 'shopping-bag'}
            size={18}
            color="#fff"
          />
          <Text style={styles.addBtnText}>
            {added
              ? 'ADDED TO CART'
              : product.isPreOrder
              ? 'PRE-ORDER NOW'
              : 'ADD TO CART'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholder: {
    height: width * 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
  },
  dot: { height: 6, borderRadius: 3 },
  info: { padding: 20, gap: 12 },
  category: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 2 },
  name: { fontSize: 22, fontWeight: '700' as const, lineHeight: 30 },
  price: { fontSize: 26, fontWeight: '800' as const },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.8 },
  sizeSection: { gap: 10, marginTop: 4 },
  sizeLabel: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.5 },
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sizeBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 52,
    alignItems: 'center',
  },
  sizeBtnText: { fontSize: 14, fontWeight: '600' as const },
  descSection: { gap: 6, marginTop: 4 },
  descLabel: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.5 },
  desc: { fontSize: 14, lineHeight: 22 },
  preOrderCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  preOrderText: { flex: 1, fontSize: 13, lineHeight: 18 },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  sizeWarning: { fontSize: 12, fontWeight: '600' as const, textAlign: 'center' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' as const, letterSpacing: 1.5 },
});
