import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { shelterService, Shelter } from '../../services/shelterService';
import { userService } from '../../services/userService';
import { distanceKm } from '../../utils/geo';

type Props = NativeStackScreenProps<RootStackParamList, 'Shelters'>;

type Filter = 'ALL' | Shelter['country'];
const FILTERS: Filter[] = ['ALL', 'CH', 'AT', 'DE'];

/**
 * One shelter per canton and Bundesland, nearest first, each a tap away from its
 * own website — which is where the dogs, the adoption rules and the people are.
 */
export default function SheltersScreen({ navigation }: Readonly<Props>) {
  const { t, i18n } = useTranslation();
  const [shelters, setShelters] = useState<Shelter[] | null>(null);
  const [error, setError] = useState(false);
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');

  useEffect(() => {
    shelterService.list().then(setShelters).catch(() => setError(true));
    userService.getMe()
      .then(me => {
        if (me.latitude != null && me.longitude != null) setOrigin({ latitude: me.latitude, longitude: me.longitude });
      })
      .catch(() => {});
  }, []);

  const rows = useMemo(() => {
    if (!shelters) return [];
    const withDistance = shelters
      .filter(s => filter === 'ALL' || s.country === filter)
      .map(s => ({
        shelter: s,
        km: origin ? distanceKm(origin.latitude, origin.longitude, s.latitude, s.longitude) : null,
      }));
    // Nearest first when we know where you are; otherwise by country and region,
    // which is how anyone would look for "their" canton by hand.
    return withDistance.sort((a, b) => a.km != null && b.km != null
      ? a.km - b.km
      : a.shelter.country.localeCompare(b.shelter.country) || a.shelter.region.localeCompare(b.shelter.region));
  }, [shelters, filter, origin]);

  const closedLabel = (closedUntil: string) => {
    const [year, month] = closedUntil.split('-').map(Number);
    const when = new Date(year, month - 1, 1).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
    return t('shelters.closedUntil', { when });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('shelters.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.filter, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{t(`shelters.filter.${f}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {shelters === null ? (
        <View style={styles.centered}>
          {error
            ? <Text style={styles.hint}>{t('shelters.loadError')}</Text>
            : <ActivityIndicator size="large" color={Colors.primary} />}
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={r => r.shelter.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.intro}>{t('shelters.intro')}</Text>}
          renderItem={({ item: { shelter, km } }) => (
            <TouchableOpacity activeOpacity={0.8} onPress={() => WebBrowser.openBrowserAsync(shelter.website)}>
              <GlassCard style={styles.card} padding={16}>
                <View style={styles.row}>
                  <View style={styles.info}>
                    <Text style={styles.region}>{t(`shelters.country.${shelter.country}`)} · {shelter.region}</Text>
                    <Text style={styles.name}>{shelter.name}</Text>
                    <Text style={styles.town}>
                      {shelter.town}
                      {km != null ? ` · ${t('shelters.kmAway', { km: Math.round(km) })}` : ''}
                    </Text>
                    {shelter.coversNeighbour && <Text style={styles.note}>{t('shelters.coversNeighbour')}</Text>}
                    {shelter.closedUntil && <Text style={styles.closed}>{closedLabel(shelter.closedUntil)}</Text>}
                  </View>
                  <Ionicons name="open-outline" size={20} color={Colors.primary} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },

  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  filter: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.glass.inputBorder, backgroundColor: Colors.glass.inputBg,
  },
  filterActive:     { borderColor: Colors.primary, backgroundColor: 'rgba(46,158,107,0.12)' },
  filterText:       { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  filterTextActive: { color: Colors.primary },

  list:  { paddingHorizontal: 16, paddingBottom: 40 },
  intro: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 12, marginTop: 4 },
  hint:  { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  card:  { marginBottom: 10 },
  row:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info:  { flex: 1 },
  region: {
    fontSize: 11, fontWeight: '800', color: Colors.primary,
    letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3,
  },
  name:   { fontSize: 16, fontWeight: '700', color: Colors.text },
  town:   { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  note:   { fontSize: 12, color: Colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  closed: { fontSize: 12, fontWeight: '700', color: Colors.error, marginTop: 4 },
});
