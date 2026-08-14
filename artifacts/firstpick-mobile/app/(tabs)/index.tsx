import React, { useState, useCallback } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { ProductCard } from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/SkeletonLoader';
import { useListProducts, useListCategories } from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';

const ALL_CAT = { id: 0, name: 'All', slug: 'all' };

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { data: categories = [] } = useListCategories();
  const {
    data: products = [],
    isLoading,
    refetch,
  } = useListProducts(
    selectedCat ? { query: { categoryId: selectedCat } } : {}
  );

  const allCats = [ALL_CAT, ...categories.filter((c) => c.isVisible)];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.logo, { color: colors.primary }]}>FIRSTPICK</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          DUBAI STREETWEAR
        </Text>
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
        style={{ maxHeight: 48 }}
      >
        {allCats.map((cat) => {
          const active = cat.id === selectedCat;
          return (
            <Pressable
              key={cat.id}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedCat(cat.id);
              }}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? colors.primary : colors.secondary,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: active ? '#fff' : colors.mutedForeground },
                ]}
              >
                {cat.name.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Product grid */}
      {isLoading ? (
        <ProductGridSkeleton />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 80 },
          ]}
          scrollEnabled={products.length > 0}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No products yet
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ProductCard
              id={item.id}
              name={item.name}
              price={item.price}
              imageUrl={item.imageUrl}
              categoryName={item.categoryName}
              sellingFast={item.sellingFast}
              spotlight={item.spotlight}
              isPreOrder={item.isPreOrder}
              rep={item.rep}
              onPress={() => router.push(`/product/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 10,
    fontWeight: '500' as const,
    letterSpacing: 4,
    marginTop: 2,
  },
  pills: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
    paddingBottom: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  grid: { paddingTop: 16, paddingHorizontal: 16 },
  row: { gap: 16, marginBottom: 20 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15 },
});
