import { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { LISTING_CATEGORIES, Listing, ListingCategory, formatPrice, marketService } from '../../services/marketService';
import { formatDistance } from '../../utils/geo';
import { getApiError } from '../../utils/apiError';
import { useListAd } from '../ads/useListAd';
import { ListAdCard } from '../ads/ListAdCard';
import { LIST_NATIVE_AD_UNIT } from '../../constants/ads';

/**
 * Dog things nearby, newest first, as a two-column grid. "Mine" switches to the
 * user's own listings, where the number of people who asked is the useful line.
 */
export function MarketplaceSection() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [mine, setMine] = useState(false);
  const [category, setCategory] = useState<ListingCategory | undefined>(undefined);
  const [items, setItems] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Under the grid (a two-column grid has no room for a full-width card between
  // listings), and under the empty state. Never between someone's own listings.
  const ad = useListAd(LIST_NATIVE_AD_UNIT, useIsFocused() && !mine);

  const load = useCallback(() => {
    setError(null);
    return (mine ? marketService.mine() : marketService.browse(category))
      .then(setItems)
      .catch(e => setError(getApiError(e)));
  }, [mine, category]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
      testID={`listing-${item.id}`}
    >
      {item.photos[0]
        ? <RemoteImage source={{ uri: item.photos[0].thumbUrl }} style={styles.photo} />
        : <View style={[styles.photo, styles.noPhoto]}><Text style={{ fontSize: 30 }}>🦴</Text></View>}
      {item.status !== 'ACTIVE' && (
        <View style={styles.statusBadge}><Text style={styles.statusText}>{t(`market.status.${item.status}`)}</Text></View>
      )}
      <Text style={styles.price}>{formatPrice(item.priceRappen, t('market.free'))}</Text>
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.meta} numberOfLines={1}>
        {mine
          ? t('market.detail.asked', { count: item.conversationCount })
          : item.distanceKm >= 0 ? formatDistance(item.distanceKm, t) : ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.sellBtn} onPress={() => navigation.navigate('EditListing', {})} testID="market-sell">
          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.sellText}>{t('market.sell')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMine(m => !m)} testID="market-mine">
          <Text style={styles.mineText}>{t(mine ? 'market.browseAll' : 'market.mine')}</Text>
        </TouchableOpacity>
      </View>

      {!mine && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
          {[undefined, ...LISTING_CATEGORIES].map(c => (
            <TouchableOpacity
              key={c ?? 'all'}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                {c ? t(`market.category.${c}`) : t('market.all')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {items === null && !error ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={items ?? []}
          numColumns={2}
          keyExtractor={l => String(l.id)}
          renderItem={renderItem}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} tintColor={Colors.primary}
              onRefresh={() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🦴</Text>
              <Text style={styles.emptyText}>{error ?? t(mine ? 'market.emptyMine' : 'market.empty')}</Text>
            </View>
          }
          ListFooterComponent={ad && !mine && !error ? <View style={styles.ad}><ListAdCard nativeAd={ad} /></View> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:   { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 },
  sellBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  sellText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  mineText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  chipsScroll: { flexGrow: 0, marginBottom: 8 },
  chips:  { paddingHorizontal: 20, gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.glass.inputBg,
  },
  chipActive:     { borderColor: Colors.primary, backgroundColor: 'rgba(46,158,107,0.12)' },
  chipText:       { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },
  list:   { paddingHorizontal: 20, paddingBottom: 110, flexGrow: 1 },
  column: { gap: 12 },
  card:   { flex: 1, marginBottom: 16, maxWidth: '50%' },
  photo:  { width: '100%', aspectRatio: 1, borderRadius: 14 },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.glass.inputBg },
  statusBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.55)' },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  price:  { fontSize: 15, fontWeight: '800', color: Colors.primary, marginTop: 6 },
  title:  { fontSize: 14, color: Colors.text, marginTop: 2 },
  meta:   { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  ad:     { marginTop: 8 },
  empty:  { alignItems: 'center', paddingTop: 50, paddingHorizontal: 30 },
  emptyEmoji: { fontSize: 42, marginBottom: 10 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
