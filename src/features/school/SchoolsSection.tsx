import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { GlassCard } from '../../components/GlassCard';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { DogSchool, schoolService } from '../../services/schoolService';
import { formatDistance } from '../../utils/geo';
import { getApiError } from '../../utils/apiError';

/** Approved dog schools nearby, and for a school's own account, the way to its page. */
export function SchoolsSection() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [schools, setSchools] = useState<DogSchool[] | null>(null);
  const [mine, setMine] = useState<DogSchool | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => Promise.all([
    schoolService.nearby().then(setSchools),
    schoolService.mine().then(setMine).catch(() => setMine(null)),
  ]).catch(e => setError(getApiError(e))), []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const header = mine === undefined ? null : mine ? (
    <TouchableOpacity onPress={() => navigation.navigate('SchoolDetail', { schoolId: mine.id })} testID="my-school">
      <GlassCard style={styles.mineCard}>
        <Text style={styles.mineTitle}>{t('school.mine.title', { name: mine.name })}</Text>
        <Text style={[styles.mineStatus, mine.status === 'REJECTED' && styles.rejected]}>
          {t(`school.status.${mine.status}`)}
        </Text>
      </GlassCard>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity style={styles.registerRow} onPress={() => navigation.navigate('EditSchool')} testID="register-school">
      <Ionicons name="school-outline" size={18} color={Colors.primary} />
      <Text style={styles.registerText}>{t('school.register')}</Text>
    </TouchableOpacity>
  );

  if (schools === null && !error) return <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />;

  return (
    <FlatList
      data={schools ?? []}
      keyExtractor={s => String(s.id)}
      ListHeaderComponent={header}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} tintColor={Colors.primary}
          onRefresh={() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }} />
      }
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => navigation.navigate('SchoolDetail', { schoolId: item.id })} testID={`school-${item.id}`}>
          <GlassCard padding={0} style={styles.card}>
            <View style={styles.row}>
              {item.logo
                ? <RemoteImage source={{ uri: item.logo }} style={styles.logo} />
                : <View style={[styles.logo, styles.noLogo]}><Text style={{ fontSize: 24 }}>🎓</Text></View>}
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.distanceKm >= 0 ? formatDistance(item.distanceKm, t) : item.address}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </View>
          </GlassCard>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎓</Text>
          <Text style={styles.emptyText}>{error ?? t('school.empty')}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list:  { paddingHorizontal: 20, paddingBottom: 110, flexGrow: 1 },
  mineCard: { marginBottom: 14 },
  mineTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  mineStatus: { fontSize: 13, color: Colors.primary, marginTop: 2, fontWeight: '600' },
  rejected: { color: Colors.error },
  registerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, marginBottom: 10 },
  registerText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  card:  { marginBottom: 12 },
  row:   { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  logo:  { width: 52, height: 52, borderRadius: 12 },
  noLogo: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46,158,107,0.12)' },
  body:  { flex: 1 },
  name:  { fontSize: 16, fontWeight: '700', color: Colors.text },
  meta:  { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 30 },
  emptyEmoji: { fontSize: 42, marginBottom: 10 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
