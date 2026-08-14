import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { useCart } from '@/contexts/CartContext';
import { useOrders } from '@/contexts/OrderContext';
import * as Haptics from 'expo-haptics';

const DELIVERY_OPTIONS = [
  { key: 'standard', label: 'Standard', sub: '3–5 days', price: 20 },
  { key: 'express', label: 'Express', sub: '1–2 days', price: 30 },
  { key: 'priority', label: 'Same Day', sub: 'Today by 9pm', price: 40 },
];
const TIP_OPTIONS = [0, 5, 10, 15];

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const { saveOrder } = useOrders();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [delivery, setDelivery] = useState('standard');
  const [tip, setTip] = useState(0);
  const [loading, setLoading] = useState(false);

  const deliveryPrice = DELIVERY_OPTIONS.find((d) => d.key === delivery)?.price ?? 20;
  const grandTotal = total + deliveryPrice + tip;

  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? '';
  const apiBase = domain ? `https://${domain}` : '';

  const handlePlace = async () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      Alert.alert('Missing info', 'Please fill in all fields');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Empty cart', 'Add items before checking out');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      // Step 1: clear server cart and add local items
      for (const item of items) {
        await fetch(`${apiBase}/api/cart/items`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: item.productId, quantity: item.quantity, size: item.size }),
        });
      }

      // Step 2: create order
      const res = await fetch(`${apiBase}/api/orders`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerAddress: address.trim(),
          paymentMethod: 'cod',
        }),
      });

      if (!res.ok) throw new Error('Failed to place order');
      const order = await res.json();

      // Save locally
      saveOrder({
        id: order.id,
        orderNumber: order.orderNumber ?? `#${order.id}`,
        status: order.status,
        total: grandTotal,
        createdAt: order.createdAt,
        itemCount: items.reduce((s, i) => s + i.quantity, 0),
      });

      clearCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/order/${order.id}`);
    } catch (e) {
      Alert.alert('Error', 'Could not place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Checkout</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>YOUR INFO</Text>
          <View style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.field}>
              <Feather name="user" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground }]}
                placeholder="Full name"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.field}>
              <Feather name="phone" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground }]}
                placeholder="Phone (e.g. 0501234567)"
                placeholderTextColor={colors.mutedForeground}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.field}>
              <Feather name="map-pin" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground }]}
                placeholder="Delivery address"
                placeholderTextColor={colors.mutedForeground}
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </View>
          </View>
        </View>

        {/* Delivery */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DELIVERY</Text>
          <View style={{ gap: 8 }}>
            {DELIVERY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setDelivery(opt.key);
                }}
                style={[
                  styles.deliveryOpt,
                  {
                    backgroundColor: delivery === opt.key ? '#1a0a00' : colors.card,
                    borderColor: delivery === opt.key ? colors.primary : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: delivery === opt.key ? colors.primary : colors.border,
                      backgroundColor: delivery === opt.key ? colors.primary : 'transparent',
                    },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deliveryLabel, { color: colors.foreground }]}>{opt.label}</Text>
                  <Text style={[styles.deliverySub, { color: colors.mutedForeground }]}>{opt.sub}</Text>
                </View>
                <Text style={[styles.deliveryPrice, { color: delivery === opt.key ? colors.primary : colors.foreground }]}>
                  AED {opt.price}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tip */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TIP YOUR DRIVER</Text>
          <View style={styles.tipRow}>
            {TIP_OPTIONS.map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTip(t);
                }}
                style={[
                  styles.tipBtn,
                  {
                    backgroundColor: tip === t ? colors.primary : colors.secondary,
                    borderColor: tip === t ? colors.primary : colors.border,
                    flex: 1,
                  },
                ]}
              >
                <Text style={[styles.tipBtnText, { color: tip === t ? '#fff' : colors.mutedForeground }]}>
                  {t === 0 ? 'None' : `+${t}`}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Order summary */}
        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Items ({items.reduce((s, i) => s + i.quantity, 0)})</Text>
            <Text style={[styles.summaryVal, { color: colors.foreground }]}>AED {total.toFixed(0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Delivery</Text>
            <Text style={[styles.summaryVal, { color: colors.foreground }]}>AED {deliveryPrice}</Text>
          </View>
          {tip > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Driver tip</Text>
              <Text style={[styles.summaryVal, { color: colors.foreground }]}>AED {tip}</Text>
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 10 }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.totalVal, { color: colors.primary }]}>AED {grandTotal.toFixed(0)}</Text>
          </View>
        </View>

        {/* COD notice */}
        <View style={[styles.codNotice, { backgroundColor: '#0d1a00', borderColor: '#1a3300' }]}>
          <Feather name="dollar-sign" size={16} color="#66cc00" />
          <Text style={[styles.codText, { color: '#a0c070' }]}>
            Cash on Delivery — pay when your order arrives
          </Text>
        </View>

        <View style={{ height: botPad + 100 }} />
      </ScrollView>

      {/* Place order button */}
      <View style={[styles.placeBar, { paddingBottom: botPad + 16, backgroundColor: colors.background }]}>
        <Pressable
          onPress={handlePlace}
          disabled={loading}
          style={[
            styles.placeBtn,
            { backgroundColor: loading ? colors.secondary : colors.primary },
          ]}
        >
          <Text style={styles.placeBtnText}>
            {loading ? 'PLACING ORDER…' : `PLACE ORDER — AED ${grandTotal.toFixed(0)}`}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700' as const },
  section: { paddingHorizontal: 16, marginTop: 20, gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.5 },
  fieldCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  field: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  fieldInput: { flex: 1, fontSize: 15 },
  divider: { height: 1, marginHorizontal: 14 },
  deliveryOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  deliveryLabel: { fontSize: 15, fontWeight: '600' as const },
  deliverySub: { fontSize: 12, marginTop: 2 },
  deliveryPrice: { fontSize: 15, fontWeight: '700' as const },
  tipRow: { flexDirection: 'row', gap: 8 },
  tipBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  tipBtnText: { fontSize: 13, fontWeight: '700' as const },
  summary: {
    margin: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14 },
  summaryVal: { fontSize: 14, fontWeight: '600' as const },
  totalLabel: { fontSize: 16, fontWeight: '700' as const },
  totalVal: { fontSize: 18, fontWeight: '800' as const },
  codNotice: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  codText: { flex: 1, fontSize: 13, lineHeight: 18 },
  placeBar: { paddingHorizontal: 16, paddingTop: 12 },
  placeBtn: { paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  placeBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' as const, letterSpacing: 1.5 },
});
