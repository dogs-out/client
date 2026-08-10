import { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { DiscoverProfile } from '../../services/discoverService';
import { sitterService } from '../../services/sitterService';
import { userService } from '../../services/userService';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { translateBreed } from '../../i18n/translateBreed';

type SitterMode = 'jobs' | 'requests';

function formatDistance(km: number, t: TFunction): string {
  if (km < 0) return '';
  if (km < 1) return t('matching.discover.lessThanOneKm');
  return t('matching.discover.distanceAway', { km: Math.round(km) });
}

export default function FindSitterScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [seekers, setSeekers] = useState<DiscoverProfile[]>([]);
  const [sitters, setSitters] = useState<DiscoverProfile[]>([]);
  const [amSitter, setAmSitter] = useState(false);
  const [amSeeking, setAmSeeking] = useState(false);
  // 'jobs' = owners who need a sitter, 'requests' = sitters an owner can ask.
  const [mode, setMode] = useState<SitterMode>('jobs');
  const [modePinned, setModePinned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [contactingId, setContactingId] = useState<number | null>(null);

  const load = useCallback(() => {
    userService.getMe()
      .then(me => {
        setAmSitter(me.isSitter);
        setAmSeeking(me.lookingForSitter);
        // Each pool is served only to the matching role (403 otherwise) — you can't
        // browse sitters until you're looking for one, or jobs until you are one.
        // Don't ask for a pool we aren't entitled to.
        return Promise.all([
          me.isSitter ? sitterService.getSeekers() : Promise.resolve([]),
          me.lookingForSitter ? sitterService.getAvailableSitters() : Promise.resolve([]),
        ]).then(([seekerPool, sitterPool]) => {
          setSeekers(seekerPool.filter(p => p.userId !== me.id));
          setSitters(sitterPool.filter(p => p.userId !== me.id));
          // Land on the side that matches the single role they enabled; once they've
          // tapped the switcher themselves, leave their choice alone on refocus.
          // Requests is only reachable while lookingForSitter holds, so a pinned
          // choice is dropped if that toggle goes off.
          if (!modePinned || (!me.lookingForSitter)) {
            setMode(me.lookingForSitter && !me.isSitter ? 'requests' : 'jobs');
          }
          setError(false);
        });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [modePinned]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openProfile = (profile: DiscoverProfile) => {
    navigation.navigate('UserProfile', { userId: profile.userId });
  };

  const contact = (profile: DiscoverProfile) => {
    if (contactingId !== null) return;
    setContactingId(profile.userId);
    sitterService.contact(profile.userId)
      .then(({ matchId }) => {
        navigation.navigate('ChatDetail', {
          matchId,
          otherUserId: profile.userId,
          name: profile.name,
          profilePicture: profile.profilePicture,
        });
      })
      .catch(() => setError(true))
      .finally(() => setContactingId(null));
  };

  // You can only start a chat from the side your own toggle backs: sitters answer
  // jobs, owners looking for a sitter reach out to sitters.
  const canContact = mode === 'jobs' ? amSitter : amSeeking;
  const data = mode === 'jobs' ? seekers : sitters;
  const showSwitcher = amSitter && amSeeking;
  // With neither toggle on both pools are withheld, so the empty list needs to say
  // "you haven't opted in" rather than "nobody is nearby".
  const hasAnyRole = amSitter || amSeeking;

  const selectMode = (next: SitterMode) => { setModePinned(true); setMode(next); };

  const renderSeeker = ({ item }: { item: DiscoverProfile }) => {
    const dist = formatDistance(item.distanceKm, t);
    const dogLine = item.dogs
      .map(d => d.breed ? `${d.name} (${translateBreed(d.breed, i18n.language)})` : d.name)
      .join(', ');
    return (
      <GlassCard style={styles.card}>
        <TouchableOpacity style={styles.cardTop} activeOpacity={0.7} onPress={() => openProfile(item)}>
          {item.profilePicture
            ? <RemoteImage source={{ uri: item.profilePicture }} style={styles.avatar} />
            : <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 26 }}>👤</Text></View>
          }
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}{item.age !== null ? `, ${item.age}` : ''}
            </Text>
            {dist !== '' && (
              <Text style={styles.cardDist}>
                <Ionicons name="location-outline" size={12} color={Colors.textSecondary} /> {dist}
              </Text>
            )}
            {dogLine !== '' && (
              <Text style={styles.cardDogs} numberOfLines={2}>🐶 {dogLine}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        {canContact && (
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => contact(item)}
            disabled={contactingId !== null}
          >
            {contactingId === item.userId ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="chatbubble-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.contactText}>{t('sitter.list.contact')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </GlassCard>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FloatingBackground />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('sitter.list.title')}</Text>
        <Text style={styles.headerSubtitle}>
          {t(mode === 'jobs' ? 'sitter.list.subtitleJobs' : 'sitter.list.subtitleRequests')}
        </Text>
      </View>

      {showSwitcher && (
        <View style={styles.segmented}>
          {(['requests', 'jobs'] as SitterMode[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.segment, mode === m && styles.segmentActive]}
              onPress={() => selectMode(m)}
            >
              <Text
                style={[styles.segmentText, mode === m && styles.segmentTextActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                maxFontSizeMultiplier={1.2}
              >
                {t(m === 'jobs' ? 'sitter.list.tabJobs' : 'sitter.list.tabRequests')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!loading && !amSitter && !amSeeking && (
        <TouchableOpacity style={styles.hintBanner} onPress={() => navigation.navigate('EditProfile')}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.hintText}>{t('sitter.list.enableSitterHint')}</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyText}>{t('sitter.list.error')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => String(item.userId)}
          renderItem={renderSeeker}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyEmoji}>🐾</Text>
              <Text style={styles.emptyText}>
                {!hasAnyRole
                  ? t('sitter.list.emptyNoRole')
                  : t(mode === 'jobs' ? 'sitter.list.empty' : 'sitter.list.emptySitters')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },

  header:         { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle:    { fontSize: 28, fontWeight: '800', color: Colors.text },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },

  hintBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: 'rgba(46,158,107,0.08)',
  },
  hintText: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 18 },

  segmented: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 8,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden',
  },
  segment:           { flex: 1, paddingVertical: 9, paddingHorizontal: 6, alignItems: 'center' },
  segmentActive:     { backgroundColor: 'rgba(46,158,107,0.12)' },
  segmentText:       { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  segmentTextActive: { color: Colors.primary },

  list: { paddingHorizontal: 20, paddingBottom: 120, flexGrow: 1 },

  card:    { marginTop: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar:  { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginRight: 8 },
  cardName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  cardDist: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  cardDogs: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },

  contactBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 12, paddingVertical: 10, borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  contactText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText:  { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  retryBtn:   { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary },
  retryText:  { color: Colors.primary, fontSize: 14, fontWeight: '700' },
});
