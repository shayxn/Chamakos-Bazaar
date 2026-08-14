import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending:          { label: 'Pending',          bg: '#1a1200', text: '#ffc200' },
  confirmed:        { label: 'Confirmed',         bg: '#0d1a00', text: '#66cc00' },
  packed:           { label: 'Packing',           bg: '#001a1a', text: '#00cccc' },
  shipped:          { label: 'Shipped',           bg: '#001020', text: '#3399ff' },
  out_for_delivery: { label: 'Out for Delivery',  bg: '#1a0800', text: '#ff6600' },
  delivered:        { label: 'Delivered',         bg: '#001a00', text: '#00cc66' },
  cancelled:        { label: 'Cancelled',         bg: '#1a0000', text: '#ef4444' },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    bg: '#1a1a1a',
    text: '#a0a0a0',
  };

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        size === 'sm' && styles.badgeSm,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: config.text },
          size === 'sm' && styles.labelSm,
        ]}
      >
        {config.label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
  labelSm: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
});
