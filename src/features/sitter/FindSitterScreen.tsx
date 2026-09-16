import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { translateTag } from '../../i18n/translateTag';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { DiscoverProfile } from '../../services/discoverService';
import { sitterService, SittingRequest } from '../../services/sitterService';
import { userService } from '../../services/userService';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { useTabBarHeight } from '../../components/GlassTabBar';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { CustomSlider } from '../../components/CustomSlider';
import { DEFAULT_RADIUS_KM } from '../../constants/discover';
import { translateBreed } from '../../i18n/translateBreed';

type SitterMode = 'jobs' | 'requests';

/** The same names the sitter profile stores, so the filter compares like with like. */
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

function formatDistance(km: number, t: TFunction): string {
  if (km < 0) return '';
  if (km < 1) return t('matching.discover.lessThanOneKm');
  return t('matching.discover.distanceAway', { km: Math.round(km) });
}

export default function FindSitterScreen() {
  const { t, i18n } = useTranslation();
  // Every phone reserves a different amount at the bottom; a constant left the
  // last row under the tab bar on those with three-button navigation.
  const tabBarHeight = useTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [seekers, setSeekers] = useState<DiscoverProfile[]>([]);
  const [sitters, setSitters] = useState<DiscoverProfile[]>([]);
  const [amSitter, setAmSitter] = useState(false);
  const [amSeeking, setAmSeeking] = useState(false);
  // 'jobs' = owners who need a sitter, 'requests' = sitters an owner can ask.
  const [mode, setMode] = useState<SitterMode>('jobs');
  /** Concrete jobs with hours attached, shown above the browsable pool. */
  const [openJobs, setOpenJobs] = useState<SittingRequest[]>([]);
  const [myJobs, setMyJobs] = useState<SittingRequest[]>([]);
  /** Null is every day. A sitter who named no days is kept either way. */
  const [weekday, setWeekday] = useState<string | null>(null);
  const [weekdayOpen, setWeekdayOpen] = useState(false);
  const [modePinned, setModePinned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [contactingId, setContactingId] = useState<number | null>(null);
  // Search distance lives on the user, shared with Discover — but Discover is
  // closed to sitters without a dog, so its filter screen (the only other place
  // this can be changed) is unreachable for exactly the people who live in this
  // tab. Without this control their radius is stuck on the 50 km default.
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [radiusOpen, setRadiusOpen] = useState(false);

  const load = useCallback(() => {
    userService.getMe()
      .then(me => {
        setAmSitter(me.isSitter);
        setAmSeeking(me.lookingForSitter);
        setRadiusKm(me.maxDistanceKm ?? DEFAULT_RADIUS_KM);
        // Each pool is served only to the matching role (403 otherwise) — you can't
        // browse sitters until you're looking for one, or jobs until you are one.
        // Don't ask for a pool we aren't entitled to.
        return Promise.all([
          me.isSitter ? sitterService.getSeekers() : Promise.resolve([]),
          me.lookingForSitter ? sitterService.getAvailableSitters(weekday) : Promise.resolve([]),
          // Open jobs are for sitters to take; own requests are for owners to manage.
          me.isSitter ? sitterService.getOpenRequests().catch(() => []) : Promise.resolve([]),
          me.lookingForSitter ? sitterService.getMyRequests().catch(() => []) : Promise.resolve([]),
        ]).then(([seekerPool, sitterPool, open, own]) => {
          setSeekers(seekerPool.filter(p => p.userId !== me.id));
          setSitters(sitterPool.filter(p => p.userId !== me.id));
          setOpenJobs(open.filter(r => !r.mine));
          // Anything still to come, plus anything finished that still owes a
          // rating. A job that is over and rated has nothing left to do and drops
          // off on its own — which is what stops this list growing forever.
          setMyJobs(own.filter(r => !r.over || r.awaitingReview));
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
  }, [modePinned, weekday]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Persist on release rather than on every step, then reload: the lists are
  // filtered server-side, so a new radius means a new request either way.
  const commitRadius = () => {
    userService.updateProfile({ maxDistanceKm: radiusKm })
      .then(() => load())
      .catch(() => setError(true));
  };

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

  const formatWindow = (job: SittingRequest) => {
    const from = new Date(job.startsAt);
    const to = new Date(job.endsAt);
    const day = from.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' });
    const time = (d: Date) => d.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
    return `${day} · ${time(from)} – ${time(to)}`;
  };

  const renderJob = (job: SittingRequest) => (
    <GlassCard key={job.id} style={styles.jobCard}>
      {/* The whole heading is the way through to the profile: deciding whether to
          take a job means looking at whose dog it is, and a request with no face
          on it is a stranger asking for a favour. */}
      <TouchableOpacity
        style={styles.jobHead}
        activeOpacity={0.7}
        // Your own request already leads nowhere useful — it is your own profile.
        disabled={job.mine}
        onPress={() => navigation.navigate('UserProfile', { userId: job.ownerId })}
      >
        {job.ownerProfilePicture
          ? <RemoteImage source={{ uri: job.ownerProfilePicture }} style={styles.jobAvatar} />
          : <View style={[styles.jobAvatar, styles.jobAvatarPlaceholder]}><Text>🐶</Text></View>}
        <View style={styles.jobHeadBody}>
          <Text style={styles.jobWindow}>{formatWindow(job)}</Text>
          <Text style={styles.jobDogs} numberOfLines={2}>
            {job.dogs.length > 0
              ? t('sitter.jobs.forDogs', { dogs: job.dogs.join(' & ') })
              : t('sitter.jobs.forADog')}
          </Text>
        </View>
        {!job.mine && <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />}
      </TouchableOpacity>
      {job.note ? <Text style={styles.jobNote} numberOfLines={3}>{job.note}</Text> : null}

      {/* Who is coming, once somebody is. The owner's most useful line by far —
          and the sitter's name is how they recognise the knock at the door. */}
      {job.sitterId != null && (
        <View style={styles.jobSitter}>
          <Ionicons name="checkmark-circle" size={15} color={Colors.primary} />
          <Text style={styles.jobSitterText} numberOfLines={1}>
            {t('sitter.jobs.sittingBy', { name: job.sitterName })}
          </Text>
        </View>
      )}

      <View style={styles.jobFooter}>
        <Text style={styles.jobOwner} numberOfLines={1}>
          {job.mine
            ? t('sitter.jobs.yours')
            : `${job.ownerName}${job.distanceKm >= 0 ? ` · ${t('matching.discover.distanceAway', { km: job.distanceKm })}` : ''}`}
        </Text>

        <View style={styles.jobActions}>
          {/* Rating comes first once it is due: it is the only thing left to do
              with a finished job, and the reminder push lands people here. */}
          {job.awaitingReview && (
            <TouchableOpacity
              style={[styles.jobBtn, styles.jobBtnPrimary]}
              onPress={() => navigation.navigate('RateSitter', { job })}
            >
              <Text style={[styles.jobBtnText, styles.jobBtnTextPrimary]}>{t('sitter.jobs.rate')}</Text>
            </TouchableOpacity>
          )}

          {job.canEdit && (
            <TouchableOpacity
              style={styles.jobBtn}
              onPress={() => navigation.navigate('PostSittingRequest', { job })}
            >
              <Text style={styles.jobBtnText}>{t('common.edit')}</Text>
            </TouchableOpacity>
          )}

          {job.mine && !job.over && (
            <TouchableOpacity style={styles.jobBtn} onPress={() => closeJob(job)}>
              <Text style={styles.jobBtnText}>{t('sitter.jobs.close')}</Text>
            </TouchableOpacity>
          )}

          {!job.mine && (
            <TouchableOpacity style={[styles.jobBtn, styles.jobBtnPrimary]} onPress={() => offerOnJob(job)}>
              <Text style={[styles.jobBtnText, styles.jobBtnTextPrimary]}>{t('sitter.jobs.offer')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </GlassCard>
  );

  /**
   * Offers to take the job, which opens the chat with the offer already in it.
   *
   * <p>The offer is a message rather than a row in a list of applicants: the owner
   * is deciding who to leave their dog with, so the conversation is the part that
   * matters and it should start straight away. The owner accepts from that bubble.
   */
  const offerOnJob = (job: SittingRequest) => {
    sitterService.offer(job.id)
      .then(({ matchId }) => {
        // Taken jobs leave this list at once rather than on the next focus: the
        // sitter has just acted on it and a row that ignores that reads as broken.
        load();
        navigation.navigate('ChatDetail', {
          matchId,
          otherUserId: job.ownerId,
          name: job.ownerName,
          profilePicture: job.ownerProfilePicture,
        });
      })
      .catch(() => Alert.alert(t('common.error'), t('sitter.jobs.contactFailed')));
  };

  const closeJob = (job: SittingRequest) => {
    Alert.alert(t('sitter.jobs.closeTitle'), t('sitter.jobs.closeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('sitter.jobs.close'),
        onPress: () => sitterService.closeRequest(job.id)
          .then(() => setMyJobs(prev => prev.filter(j => j.id !== job.id)))
          .catch(() => Alert.alert(t('common.error'), t('sitter.jobs.closeFailed'))),
      },
    ]);
  };

  const listHeader = () => {
    const jobs = mode === 'jobs' ? openJobs : myJobs;
    if (jobs.length === 0) return null;
    return (
      <View style={styles.jobsBlock}>
        <Text style={styles.jobsTitle}>
          {t(mode === 'jobs' ? 'sitter.jobs.openTitle' : 'sitter.jobs.mineTitle')}
        </Text>
        {jobs.map(renderJob)}
        <Text style={styles.jobsDivider}>
          {t(mode === 'jobs' ? 'sitter.jobs.thenBrowse' : 'sitter.jobs.thenSitters')}
        </Text>
      </View>
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

      {mode === 'requests' && amSeeking && (
        <TouchableOpacity style={styles.postBtn} onPress={() => navigation.navigate('PostSittingRequest')}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.postBtnText}>{t('sitter.jobs.post')}</Text>
        </TouchableOpacity>
      )}

      {mode === 'requests' && amSeeking && (
        <View style={styles.weekdayBlock}>
          {/* A dropdown, not a row of chips: seven days plus "any" is more than a
              row can hold without scrolling, and a horizontal scroller hides its
              own options. The same shape as the radius control below it. */}
          <TouchableOpacity
            style={styles.weekdayPill}
            onPress={() => setWeekdayOpen(open => !open)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={15} color={Colors.primary} />
            <Text style={styles.weekdayPillText}>
              {weekday ? translateTag(weekday, t) : t('sitter.jobs.anyDay')}
            </Text>
            <Ionicons
              name={weekdayOpen ? 'chevron-up' : 'chevron-down'}
              size={15}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {weekdayOpen && (
            <GlassCard style={styles.weekdayCard} padding={6}>
              {[null, ...WEEKDAYS].map(day => {
                const active = weekday === day;
                return (
                  <TouchableOpacity
                    key={day ?? 'any'}
                    style={styles.weekdayOption}
                    onPress={() => { setWeekday(day); setWeekdayOpen(false); }}
                  >
                    <Text style={[styles.weekdayOptionText, active && styles.weekdayOptionTextActive]}>
                      {day ? translateTag(day, t) : t('sitter.jobs.anyDay')}
                    </Text>
                    {active && <Ionicons name="checkmark" size={17} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </GlassCard>
          )}
        </View>
      )}

      {hasAnyRole && (
        <View style={styles.radiusBlock}>
          <TouchableOpacity
            style={styles.radiusPill}
            onPress={() => setRadiusOpen(open => !open)}
            activeOpacity={0.7}
          >
            <Ionicons name="location-outline" size={15} color={Colors.primary} />
            <Text style={styles.radiusPillText}>
              {t('sitter.list.withinKm', { km: radiusKm })}
            </Text>
            <Ionicons
              name={radiusOpen ? 'chevron-up' : 'chevron-down'}
              size={15}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {radiusOpen && (
            <GlassCard style={styles.radiusCard} padding={16}>
              <View style={styles.radiusLabels}>
                <Text style={styles.radiusEdge}>1 km</Text>
                <Text style={styles.radiusValue}>{t('sitter.list.withinKm', { km: radiusKm })}</Text>
                <Text style={styles.radiusEdge}>{DEFAULT_RADIUS_KM} km</Text>
              </View>
              <CustomSlider
                value={radiusKm}
                min={1}
                max={DEFAULT_RADIUS_KM}
                step={1}
                onChange={setRadiusKm}
                onDragEnd={commitRadius}
              />
              <Text style={styles.radiusHint}>{t('sitter.list.radiusHint')}</Text>
            </GlassCard>
          )}
        </View>
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
          ListHeaderComponent={listHeader}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 24 }]}
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
  // ─── Open jobs ────────────────────────────────────────────────────────────
  jobsBlock:   { marginBottom: 6 },
  jobsTitle:   { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.4, marginBottom: 8 },
  jobsDivider: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.4, marginTop: 16, marginBottom: 2 },
  jobCard:     { marginBottom: 10 },
  jobHead:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  jobSitter:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  jobSitterText: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.primary },
  jobActions:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  jobHeadBody: { flex: 1 },
  jobAvatar:   { width: 46, height: 46, borderRadius: 23 },
  jobAvatarPlaceholder: { backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  jobWindow:   { fontSize: 15, fontWeight: '800', color: Colors.text },
  jobDogs:     { fontSize: 14, color: Colors.text, marginTop: 3 },
  jobNote:     { fontSize: 13, color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },
  jobFooter:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  jobOwner:    { flex: 1, fontSize: 13, color: Colors.textSecondary },
  jobBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
  },
  jobBtnPrimary:     { borderColor: Colors.primary, backgroundColor: 'rgba(46,158,107,0.12)' },
  jobBtnText:        { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  jobBtnTextPrimary: { color: Colors.primary },

  postBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 10,
    paddingVertical: 11,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary,
    backgroundColor: 'rgba(46,158,107,0.10)',
  },
  postBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  // ─── Weekday filter ───────────────────────────────────────────────────────
  weekdayBlock: { paddingHorizontal: 20, marginBottom: 8 },
  weekdayPill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: 'rgba(46,158,107,0.08)',
  },
  weekdayPillText: { fontSize: 13, fontWeight: '700', color: Colors.text },
  weekdayCard:     { marginTop: 8 },
  weekdayOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, paddingHorizontal: 10,
  },
  weekdayOptionText:       { fontSize: 15, color: Colors.textSecondary },
  weekdayOptionTextActive: { color: Colors.text, fontWeight: '700' },

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

  radiusBlock: { paddingHorizontal: 20, marginBottom: 4 },
  radiusPill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: 'rgba(46,158,107,0.08)',
  },
  radiusPillText: { fontSize: 13, fontWeight: '700', color: Colors.text },
  radiusCard:  { marginTop: 10 },
  radiusLabels: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  radiusEdge:  { fontSize: 12, color: Colors.textSecondary },
  radiusValue: { fontSize: 15, fontWeight: '700', color: Colors.text },
  radiusHint:  { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginTop: 4 },

  list: { paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 },

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
