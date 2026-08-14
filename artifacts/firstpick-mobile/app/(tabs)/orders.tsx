import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { StatusBadge } from '@/components/StatusBadge';
import { useOrders } from '@/contexts/OrderContext';
import * as Haptics from 'expo-haptics';

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { savedOrders } = useOrders();

  const [trackNum, setTrackNum] = useState('');
  const [trackPhone, setTrackPhone] = useState('');

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: botPad + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Orders</Text>
      </View>

      {/* Track order card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Track an Order</Text>
        <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
          Enter your order number and phone
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
          placeholder="Order number (e.g. FP-1234)"
          placeholderTextColor={colors.mutedForeground}
          value={trackNum}
          onChangeText={setTrackNum}
          autoCapitalize="characters"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
          placeholder="Phone number"
          placeholderTextColor={colors.mutedForeground}
          value={trackPhone}
          onChangeText={setTrackPhone}
          keyboardType="phone-pad"
        />
        <Pressable
          style={[
            styles.trackBtn,
            {
              backgroundColor: trackNum && trackPhone ? colors.primary : colors.secondary,
            },
          ]}
          disabled={!trackNum || !trackPhone}
          onPress={() => {
            if (!trackNum || !trackPhone) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(
              `/track?orderNumber=${encodeURIComponent(trackNum)}&phone=${encodeURIComponent(trackPhone)}`
            );
          }}
        >
          <Text
            style={[
              styles.trackBtnText,
              { color: trackNum && trackPhone ? '#fff' : colors.mutedForeground },
            ]}
          >
            TRACK ORDER
          </Text>
        </Pressable>
      </View>

      {/* Recent orders from this device */}
      {savedOrders.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginTop: 24, gap: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            RECENT ORDERS
          </Text>
          {savedOrders.map((order) => (
            <Pressable
              key={order.id}
              style={[styles.orderRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/order/${order.id}`)}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.orderNum, { color: colors.foreground }]}>
                  {order.orderNumber}
                </Text>
                <Text style={[styles.orderMeta, { color: colors.mutedForeground }]}>
                  {order.itemCount} item{order.itemCount !== 1 ? 's' : ''} · AED {order.total.toFixed(0)}
                </Text>
                <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>
                  {new Date(order.createdAt).toLocaleDateString('en-AE', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <StatusBadge status={order.status} size="sm" />
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {savedOrders.length === 0 && (
        <View style={styles.empty}>
          <Feather name="package" size={48} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No orders yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Your order history will appear here
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700' as const },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  cardTitle: { fontSize: 17, fontWeight: '700' as const },
  cardSubtitle: { fontSize: 13 },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  trackBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  trackBtnText: { fontSize: 13, fontWeight: '800' as const, letterSpacing: 1 },
  sectionTitle: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.5 },
  orderRow: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  orderNum: { fontSize: 15, fontWeight: '700' as const },
  orderMeta: { fontSize: 13 },
  orderDate: { fontSize: 12 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, marginTop: 8 },
  emptySubtitle: { fontSize: 14 },
});
