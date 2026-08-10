import { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { playdateService, Playdate } from '../../services/playdateService';
import { chatSocket } from '../../services/socket';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';

const VISIBILITY_ICONS: Record<Playdate['visibility'], string> = {
  PUBLIC: 'earth-outline',
  MATCHES_ONLY: 'heart-outline',
  INVITE_ONLY: 'mail-outline',
};

export function formatPlaydateTime(iso: string, language: string): string {
  const date = new Date(iso);
  const dateStr = date.toLocaleDateString(language, { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} · ${timeStr}`;
}

export default function PlaydatesScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [playdates, setPlaydates] = useState<Playdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    playdateService.getPlaydates()
      .then(data => { setPlaydates(data); setError(false); })
      .catch(() => setError(true))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const unsubscribe = chatSocket.subscribe(event => {
        if (event.type === 'PLAYDATE_UPDATED') load();
      });
      return unsubscribe;
    }, [load])
  );

  const myBadge = (p: Playdate): { label: string; active: boolean } | null => {
    if (p.myStatus === 'HOST') return { label: t('playdates.detail.hosting'), active: true };
    if (p.myStatus === 'JOINED') return { label: t('playdates.detail.going'), active: true };
    if (p.myStatus === 'INVITED') return { label: t('playdates.detail.invited'), active: false };
    return null;
  };

  const renderPlaydate = ({ item }: { item: Playdate }) => {
    const badge = myBadge(item);
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('PlaydateDetail', { playdateId: item.id })}>
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title ?? item.parkName}</Text>
              {item.title && <Text style={styles.cardPark} numberOfLines={1}>
                <Ionicons name="location-outline" size={12} color={Colors.textSecondary} /> {item.parkName}
              </Text>}
            </View>
            <Ionicons name={VISIBILITY_ICONS[item.visibility] as any} size={18} color={Colors.textSecondary} />
          </View>

          <Text style={styles.cardTime}>
            <Ionicons name="time-outline" size={13} color={Colors.primary} /> {formatPlaydateTime(item.startsAt, i18n.language)}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.hostWrap}>
              {item.hostProfilePicture
                ? <RemoteImage source={{ uri: item.hostProfilePicture }} style={styles.hostAvatar} />
                : <View style={[styles.hostAvatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 12 }}>🐶</Text></View>
              }
              <Text style={styles.hostName} numberOfLines={1}>{item.hostName}</Text>
            </View>
            <View style={styles.footerRight}>
              <Text style={styles.countText}>
                <Ionicons name="paw-outline" size={12} color={Colors.textSecondary} /> {item.joinedCount}{item.maxParticipants ? `/${item.maxParticipants}` : ''}
              </Text>
              {badge && (
                <View style={[styles.badge, badge.active && styles.badgeActive]}>
                  <Text style={[styles.badgeText, badge.active && styles.badgeTextActive]}>{badge.label}</Text>
                </View>
              )}
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FloatingBackground />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('playdates.headerTitle')}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={playdates}
          keyExtractor={item => String(item.id)}
          renderItem={renderPlaydate}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyEmoji}>{error ? '⚠️' : '🐾'}</Text>
              <Text style={styles.emptyText}>{error ? t('playdates.loadError') : t('playdates.empty')}</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreatePlaydate')}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },

  header:      { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.text },

  list: { paddingHorizontal: 20, paddingBottom: 130, flexGrow: 1 },

  card:       { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitleWrap: { flex: 1 },
  cardTitle:  { fontSize: 17, fontWeight: '700', color: Colors.text },
  cardPark:   { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  cardTime:   { fontSize: 14, color: Colors.text, fontWeight: '600', marginTop: 8 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  hostWrap:   { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  hostAvatar: { width: 24, height: 24, borderRadius: 12 },
  avatarPlaceholder: { backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  hostName:   { fontSize: 13, color: Colors.textSecondary, flexShrink: 1 },
  footerRight:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  countText:  { fontSize: 13, color: Colors.textSecondary },

  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  badgeActive:{ borderColor: Colors.primary, backgroundColor: 'rgba(46,158,107,0.12)' },
  badgeText:  { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  badgeTextActive: { color: Colors.primary },

  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText:  { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  fab: {
    // Clears the floating tab bar (~94pt tall incl. its bottom inset) with margin
    // to spare — at 110 the + sat under the bar's top edge on iOS.
    position: 'absolute', right: 20, bottom: 128,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
});
