import React from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface MenuItem {
  icon: string;
  label: string;
  onPress: () => void;
  accent?: boolean;
}

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Support',
      items: [
        {
          icon: 'message-circle',
          label: 'WhatsApp Us',
          accent: true,
          onPress: () =>
            Linking.openURL(
              'https://wa.me/971500000000?text=Hi%20FirstPick%20team!'
            ),
        },
        {
          icon: 'instagram',
          label: 'Instagram',
          onPress: () => Linking.openURL('https://instagram.com/firstpickdxb'),
        },
        {
          icon: 'mail',
          label: 'Email Us',
          onPress: () =>
            Linking.openURL('mailto:hello@firstpick.ae'),
        },
      ],
    },
    {
      title: 'Info',
      items: [
        {
          icon: 'info',
          label: 'About FirstPick',
          onPress: () => {},
        },
        {
          icon: 'shield',
          label: 'Privacy Policy',
          onPress: () => {},
        },
        {
          icon: 'file-text',
          label: 'Terms & Conditions',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: botPad + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Account</Text>
      </View>

      {/* Brand card */}
      <View style={[styles.brandCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.brandIcon, { backgroundColor: '#1a0a00' }]}>
          <Text style={[styles.brandInitials, { color: colors.primary }]}>FP</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.brandName, { color: colors.foreground }]}>FirstPick</Text>
          <Text style={[styles.brandTagline, { color: colors.mutedForeground }]}>
            Dubai Streetwear · UAE
          </Text>
        </View>
      </View>

      {/* COD notice */}
      <View style={[styles.noticeCard, { backgroundColor: '#0d1200', borderColor: '#1a2200' }]}>
        <Feather name="truck" size={16} color={colors.primary} />
        <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
          Cash on Delivery only · Delivered across UAE in 2–5 business days
        </Text>
      </View>

      {/* Menu sections */}
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            {section.title.toUpperCase()}
          </Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {section.items.map((item, idx) => (
              <React.Fragment key={item.label}>
                <Pressable
                  style={({ pressed }) => [
                    styles.menuItem,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={item.onPress}
                >
                  <Feather
                    name={item.icon as any}
                    size={18}
                    color={item.accent ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.menuLabel,
                      { color: item.accent ? colors.primary : colors.foreground },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Feather name="chevron-right" size={16} color={colors.border} style={{ marginLeft: 'auto' }} />
                </Pressable>
                {idx < section.items.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      ))}

      <Text style={[styles.version, { color: colors.border }]}>FirstPick v1.0 · Made in Dubai 🇦🇪</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700' as const },
  brandCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  brandIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandInitials: { fontSize: 22, fontWeight: '900' as const, letterSpacing: 1 },
  brandName: { fontSize: 18, fontWeight: '700' as const },
  brandTagline: { fontSize: 13, marginTop: 2 },
  noticeCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  section: { paddingHorizontal: 16, marginTop: 20, gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.5 },
  menuCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuLabel: { fontSize: 15, fontWeight: '500' as const },
  divider: { height: 1, marginLeft: 46 },
  version: { textAlign: 'center', fontSize: 12, marginTop: 32, marginBottom: 8 },
});
