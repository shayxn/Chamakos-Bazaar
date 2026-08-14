import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ProductCard } from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/SkeletonLoader';
import { useListProducts } from '@workspace/api-client-react';

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const { data: products = [], isLoading } = useListProducts(
    query.length >= 2 ? { query: { search: query } } : {}
  );

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Search</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Search drops, brands…"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Feather
              name="x"
              size={16}
              color={colors.mutedForeground}
              onPress={() => setQuery('')}
            />
          )}
        </View>
      </View>

      {query.length < 2 ? (
        <View style={styles.empty}>
          <Feather name="search" size={48} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Find your next drop
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Search by name, brand or style
          </Text>
        </View>
      ) : isLoading ? (
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
          ListHeaderComponent={
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {products.length} result{products.length !== 1 ? 's' : ''}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="frown" size={48} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No results for "{query}"
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
  header: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  title: { fontSize: 28, fontWeight: '700' as const },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15 },
  grid: { paddingTop: 8, paddingHorizontal: 16 },
  row: { gap: 16, marginBottom: 20 },
  count: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5, marginBottom: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '600' as const, marginTop: 8 },
  emptySubtitle: { fontSize: 14 },
});
