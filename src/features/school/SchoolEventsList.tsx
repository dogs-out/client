import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { SchoolEvent, schoolService } from '../../services/schoolService';
import { getApiError } from '../../utils/apiError';
import { EventCard } from './EventCard';
import { useListAd } from '../ads/useListAd';
import { ListAdCard } from '../ads/ListAdCard';
import { AD_AFTER_LIST_ITEMS, LIST_NATIVE_AD_UNIT } from '../../constants/ads';

type Row = SchoolEvent | { kind: 'ad' };

/** Dog-school events nearby, soonest first: the "Events" view of the Playdates tab. */
export function SchoolEventsList({ bottomInset }: Readonly<{ bottomInset: number }>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [events, setEvents] = useState<SchoolEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const ad = useListAd(LIST_NATIVE_AD_UNIT, useIsFocused());

  const load = useCallback(() => schoolService.events()
    .then(e => { setEvents(e); setError(null); })
    .catch(e => setError(getApiError(e))), []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (events === null && !error) return <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />;

  // After the third event, or at the end of a shorter list; an empty list shows it
  // under the empty state instead.
  const list = events ?? [];
  const rows: Row[] = ad && list.length > 0
    ? [...list.slice(0, AD_AFTER_LIST_ITEMS), { kind: 'ad' }, ...list.slice(AD_AFTER_LIST_ITEMS)]
    : list;

  return (
    <FlatList<Row>
      data={rows}
      keyExtractor={r => ('kind' in r ? 'ad' : String(r.id))}
      renderItem={({ item }) => ('kind' in item
        ? (ad ? <ListAdCard nativeAd={ad} /> : null)
        : <EventCard event={item} onPress={() => navigation.navigate('EventDetail', { eventId: item.id })} />)}
      contentContainerStyle={[styles.list, { paddingBottom: bottomInset }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} tintColor={Colors.primary}
          onRefresh={() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }} />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎓</Text>
          <Text style={styles.emptyText}>{error ?? t('school.event.empty')}</Text>
          {ad && !error && <View style={styles.emptyAd}><ListAdCard nativeAd={ad} /></View>}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list:  { paddingHorizontal: 20, flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 30 },
  emptyEmoji: { fontSize: 42, marginBottom: 10 },
  emptyAd: { alignSelf: 'stretch', marginTop: 24 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
