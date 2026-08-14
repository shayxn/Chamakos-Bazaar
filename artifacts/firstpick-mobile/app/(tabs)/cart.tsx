import React from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useCart } from '@/contexts/CartContext';
import * as Haptics from 'expo-haptics';

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, removeItem, updateQuantity, total, itemCount } = useCart();

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Cart</Text>
        {itemCount > 0 && (
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="shopping-bag" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Your cart is empty
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Browse drops and add something fire
          </Text>
          <Pressable
            onPress={() => router.push('/')}
            style={[styles.browseBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.browseBtnText}>BROWSE DROPS</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(i) => `${i.productId}-${i.size}`}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 200 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={[styles.cartItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.itemImage, { backgroundColor: colors.secondary }]}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={{ flex: 1 }} contentFit="cover" />
                  ) : (
                    <Feather name="package" size={24} color={colors.mutedForeground} />
                  )}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {item.size && (
                    <Text style={[styles.itemSize, { color: colors.mutedForeground }]}>
                      Size: {item.size}
                    </Text>
                  )}
                  <Text style={[styles.itemPrice, { color: colors.primary }]}>
                    AED {(item.price * item.quantity).toFixed(0)}
                  </Text>
                  <View style={styles.qtyRow}>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updateQuantity(item.productId, item.size, item.quantity - 1);
                      }}
                      style={[styles.qtyBtn, { borderColor: colors.border }]}
                    >
                      <Feather name="minus" size={14} color={colors.foreground} />
                    </Pressable>
                    <Text style={[styles.qtyNum, { color: colors.foreground }]}>
                      {item.quantity}
                    </Text>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updateQuantity(item.productId, item.size, item.quantity + 1);
                      }}
                      style={[styles.qtyBtn, { borderColor: colors.border }]}
                    >
                      <Feather name="plus" size={14} color={colors.foreground} />
                    </Pressable>
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    removeItem(item.productId, item.size);
                  }}
                  hitSlop={8}
                >
                  <Feather name="trash-2" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            )}
          />

          {/* Sticky checkout bar */}
          <View
            style={[
              styles.checkoutBar,
              { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: botPad + 16 },
            ]}
          >
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
              <Text style={[styles.totalAmt, { color: colors.foreground }]}>
                AED {total.toFixed(0)}
              </Text>
            </View>
            <Text style={[styles.deliveryNote, { color: colors.mutedForeground }]}>
              + delivery from AED 20
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/checkout');
              }}
              style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.checkoutBtnText}>CHECKOUT — AED {total.toFixed(0)}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, gap: 4 },
  title: { fontSize: 28, fontWeight: '700' as const },
  count: { fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const, marginTop: 12 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
  browseBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  browseBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' as const, letterSpacing: 1 },
  cartItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    alignItems: 'flex-start',
  },
  itemImage: {
    width: 72,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  itemSize: { fontSize: 12 },
  itemPrice: { fontSize: 16, fontWeight: '700' as const, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyNum: { fontSize: 15, fontWeight: '600' as const, minWidth: 20, textAlign: 'center' },
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 6,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14 },
  totalAmt: { fontSize: 18, fontWeight: '700' as const },
  deliveryNote: { fontSize: 12 },
  checkoutBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  checkoutBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' as const, letterSpacing: 1.5 },
});
