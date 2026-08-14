import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { StatusBadge } from '@/components/StatusBadge';
import { useGetOrder } from '@workspace/api-client-react';

const STATUS_STEPS = [
  { key: 'pending',          icon: 'check-circle',     label: 'Order Placed' },
  { key: 'confirmed',        icon: 'phone-call',       label: 'Confirmed' },
  { key: 'packed',           icon: 'package',          label: 'Packed' },
  { key: 'shipped',          icon: 'truck',            label: 'Shipped' },
  { key: 'out_for_delivery', icon: 'navigation',       label: 'Out for Delivery' },
  { key: 'delivered',        icon: 'check-circle',     label: 'Delivered' },
];

function getStepIndex(status: string) {
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

export default function OrderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const { data: order, isLoading } = useGetOrder({ path: { id: parseInt(id, 10) } });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 120 }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  const currentStep = order ? getStepIndex(order.status) : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <Pressable
            onPress={() => router.replace('/(tabs)/orders')}
            style={[styles.homeBtn, { backgroundColor: colors.secondary }]}
            hitSlop={10}
          >
            <Feather name="home" size={18} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Success animation */}
        <Animated.View style={[styles.successSection, { opacity, transform: [{ scale }] }]}>
          <View style={[styles.checkCircle, { backgroundColor: '#001a00' }]}>
            <Feather name="check" size={40} color="#00cc66" />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Order Placed!</Text>
          <Text style={[styles.successSubtitle, { color: colors.mutedForeground }]}>
            Thanks for your order. We'll confirm via WhatsApp shortly.
          </Text>
        </Animated.View>

        {isLoading ? (
          <View style={styles.loading}>
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading…</Text>
          </View>
        ) : order ? (
          <>
            {/* Order info card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardRow}>
                <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Order</Text>
                <Text style={[styles.cardVal, { color: colors.foreground }]}>
                  {order.orderNumber ?? `#${order.id}`}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.cardRow}>
                <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Status</Text>
                <StatusBadge status={order.status} />
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.cardRow}>
                <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Total</Text>
                <Text style={[styles.cardVal, { color: colors.primary }]}>
                  AED {order.total.toFixed(0)}
                </Text>
              </View>
              {order.estimatedDelivery && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.cardRow}>
                    <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Est. Delivery</Text>
                    <Text style={[styles.cardVal, { color: colors.foreground }]}>
                      {order.estimatedDelivery}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Status timeline */}
            <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ORDER PROGRESS</Text>
              <View style={{ marginTop: 12, gap: 0 }}>
                {STATUS_STEPS.filter((s) => s.key !== 'cancelled').map((step, idx) => {
                  const done = idx <= currentStep;
                  const active = idx === currentStep;
                  const isLast = idx === STATUS_STEPS.filter((s) => s.key !== 'cancelled').length - 1;
                  return (
                    <View key={step.key} style={styles.stepRow}>
                      <View style={styles.stepLeft}>
                        <View
                          style={[
                            styles.stepDot,
                            {
                              backgroundColor: done ? colors.primary : colors.secondary,
                              borderColor: done ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Feather
                            name={step.icon as any}
                            size={12}
                            color={done ? '#fff' : colors.border}
                          />
                        </View>
                        {!isLast && (
                          <View
                            style={[
                              styles.stepLine,
                              { backgroundColor: idx < currentStep ? colors.primary : colors.border },
                            ]}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.stepLabel,
                          {
                            color: active ? colors.foreground : done ? colors.mutedForeground : colors.border,
                            fontWeight: active ? ('700' as const) : ('400' as const),
                          },
                        ]}
                      >
                        {step.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Items */}
            {order.items && order.items.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ITEMS</Text>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}>
                  {order.items.map((item, idx) => (
                    <React.Fragment key={item.id}>
                      <View style={styles.itemRow}>
                        <View style={styles.itemQtyBadge}>
                          <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>×{item.quantity}</Text>
                        </View>
                        <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
                          {item.productName}{item.size ? ` (${item.size})` : ''}
                        </Text>
                        <Text style={[styles.itemPrice, { color: colors.foreground }]}>
                          AED {(item.price * item.quantity).toFixed(0)}
                        </Text>
                      </View>
                      {idx < order.items.length - 1 && (
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      )}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : null}

        <View style={{ height: botPad + 100 }} />
      </ScrollView>

      {/* Actions */}
      <View style={[styles.actions, { paddingBottom: botPad + 16, backgroundColor: colors.background }]}>
        <Pressable
          onPress={() => {
            const msg = `Hi FirstPick! I placed an order${order ? ` (${order.orderNumber ?? '#' + order.id})` : ''}. Can you confirm?`;
            Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(msg)}`);
          }}
          style={[styles.actionBtn, { backgroundColor: '#00a651' }]}
        >
          <Feather name="message-circle" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>CONFIRM ON WHATSAPP</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/')}
          style={[styles.actionBtnSecondary, { borderColor: colors.border }]}
        >
          <Text style={[styles.actionBtnSecondaryText, { color: colors.foreground }]}>Continue Shopping</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8, alignItems: 'flex-end' },
  homeBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  successSection: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 12 },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontSize: 26, fontWeight: '800' as const },
  successSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  loading: { padding: 40, alignItems: 'center' },
  loadingText: { fontSize: 15 },
  card: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  cardLabel: { fontSize: 14 },
  cardVal: { fontSize: 15, fontWeight: '600' as const },
  divider: { height: 1, marginHorizontal: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.5 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepLeft: { alignItems: 'center', width: 28 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: { width: 2, height: 28, marginTop: 2 },
  stepLabel: { fontSize: 14, lineHeight: 28 },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  itemQtyBadge: { width: 28, alignItems: 'center' },
  itemQty: { fontSize: 13, fontWeight: '600' as const },
  itemName: { flex: 1, fontSize: 14 },
  itemPrice: { fontSize: 14, fontWeight: '600' as const },
  actions: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' as const, letterSpacing: 1 },
  actionBtnSecondary: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBtnSecondaryText: { fontSize: 15, fontWeight: '600' as const },
});
