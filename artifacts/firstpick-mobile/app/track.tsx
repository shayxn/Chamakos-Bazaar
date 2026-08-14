import React from 'react';
import {
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
import { useTrackOrder } from '@workspace/api-client-react';

const STATUS_STEPS = [
  { key: 'pending',          icon: 'check-circle',  label: 'Order Placed' },
  { key: 'confirmed',        icon: 'phone-call',    label: 'Confirmed' },
  { key: 'packed',           icon: 'package',       label: 'Packed' },
  { key: 'shipped',          icon: 'truck',         label: 'Shipped' },
  { key: 'out_for_delivery', icon: 'navigation',    label: 'Out for Delivery' },
  { key: 'delivered',        icon: 'check-circle',  label: 'Delivered' },
];

export default function TrackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orderNumber, phone } = useLocalSearchParams<{ orderNumber: string; phone: string }>();

  const { data: order, isLoading, error } = useTrackOrder({
    query: { orderNumber: orderNumber ?? '', phone: phone ?? '' },
  });

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  const currentStep = order
    ? STATUS_STEPS.findIndex((s) => s.key === order.status)
    : -1;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Track Order</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <Text style={[styles.msg, { color: colors.mutedForeground }]}>Looking up your order…</Text>
        </View>
      )}

      {!isLoading && (error || !order) && (
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={colors.border} />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>Order not found</Text>
          <Text style={[styles.msg, { color: colors.mutedForeground }]}>
            Check your order number and phone number
          </Text>
          <Pressable onPress={() => router.back()} style={[styles.retryBtn, { borderColor: colors.border }]}>
            <Text style={[styles.retryText, { color: colors.foreground }]}>Try again</Text>
          </Pressable>
        </View>
      )}

      {order && (
        <ScrollView contentContainerStyle={{ paddingBottom: botPad + 40 }}>
          {/* Status card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardRow}>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Order</Text>
              <Text style={[styles.cardVal, { color: colors.foreground }]}>{order.orderNumber}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.cardRow}>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Status</Text>
              <StatusBadge status={order.status} />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.cardRow}>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Total</Text>
              <Text style={[styles.cardVal, { color: colors.primary }]}>AED {order.total.toFixed(0)}</Text>
            </View>
            {order.estimatedDelivery && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.cardRow}>
                  <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Est. Delivery</Text>
                  <Text style={[styles.cardVal, { color: colors.foreground }]}>{order.estimatedDelivery}</Text>
                </View>
              </>
            )}
            {order.trackingNote && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={[styles.noteRow, { backgroundColor: '#1a0a00' }]}>
                  <Feather name="info" size={14} color={colors.primary} />
                  <Text style={[styles.noteText, { color: colors.mutedForeground }]}>{order.trackingNote}</Text>
                </View>
              </>
            )}
          </View>

          {/* Timeline */}
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PROGRESS</Text>
            <View style={{ marginTop: 12 }}>
              {STATUS_STEPS.map((step, idx) => {
                const done = idx <= currentStep;
                const active = idx === currentStep;
                const isLast = idx === STATUS_STEPS.length - 1;
                return (
                  <View key={step.key} style={styles.stepRow}>
                    <View style={styles.stepLeft}>
                      <View style={[styles.stepDot, {
                        backgroundColor: done ? colors.primary : colors.secondary,
                        borderColor: done ? colors.primary : colors.border,
                      }]}>
                        <Feather name={step.icon as any} size={12} color={done ? '#fff' : colors.border} />
                      </View>
                      {!isLast && <View style={[styles.stepLine, { backgroundColor: idx < currentStep ? colors.primary : colors.border }]} />}
                    </View>
                    <Text style={[styles.stepLabel, {
                      color: active ? colors.foreground : done ? colors.mutedForeground : colors.border,
                      fontWeight: active ? '700' as const : '400' as const,
                    }]}>{step.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  title: { fontSize: 18, fontWeight: '700' as const },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  msg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorTitle: { fontSize: 20, fontWeight: '700' as const, marginTop: 8 },
  retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  retryText: { fontSize: 15, fontWeight: '600' as const },
  card: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  cardLabel: { fontSize: 14 },
  cardVal: { fontSize: 15, fontWeight: '600' as const },
  divider: { height: 1, marginHorizontal: 14 },
  noteRow: { flexDirection: 'row', gap: 10, padding: 14, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.5 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepLeft: { alignItems: 'center', width: 28 },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepLine: { width: 2, height: 28, marginTop: 2 },
  stepLabel: { fontSize: 14, lineHeight: 28 },
  primary: { color: '#ff6600' },
});
