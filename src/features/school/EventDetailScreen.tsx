import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { EventOccurrence, EventParticipant, SchoolEvent, schoolService } from '../../services/schoolService';
import { formatPrice } from '../../services/marketService';
import { getApiError } from '../../utils/apiError';
import { eventWhen } from './EventCard';
import { openInMaps } from './SchoolDetailScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

export default function EventDetailScreen({ navigation, route }: Readonly<Props>) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const { eventId } = route.params;
  const [event, setEvent] = useState<SchoolEvent | null>(null);
  const [people, setPeople] = useState<EventParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    schoolService.event(eventId).then(e => {
      setEvent(e);
      if (e.mine) schoolService.participants(e.id).then(setPeople).catch(() => {});
    }).catch(e => setError(getApiError(e)));
  }, [eventId]));

  const run = async (work: () => Promise<SchoolEvent>) => {
    setBusy(true);
    try {
      const updated = await work();
      setEvent(updated);
      if (updated.mine) schoolService.participants(updated.id).then(setPeople).catch(() => {});
    } catch (e) {
      Alert.alert(t('common.error'), getApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const isCourse = event?.signupMode === 'COURSE';
  const byDate = event?.signupMode === 'DATE';

  /** One-off or whole course. A course says first what signing up commits to. */
  const toggle = () => {
    if (!event) return;
    if (event.joined) { run(() => schoolService.leave(event.id)); return; }
    const others = Math.max(0, (event.remainingClasses ?? 0) - 1);
    if (isCourse && others > 0) {
      Alert.alert(t('school.event.courseConfirmTitle'), t('school.event.courseNote', { count: others }), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('school.event.join'), onPress: () => run(() => schoolService.join(event.id)) },
      ]);
      return;
    }
    run(() => schoolService.join(event.id));
  };

  /** One class of a per-date event. */
  const toggleDate = (o: EventOccurrence) => {
    if (!event) return;
    run(() => (o.joined ? schoolService.leave(event.id, o.date) : schoolService.join(event.id, o.date)));
  };

  /** The school calling off one class. */
  const cancelOneDate = (o: EventOccurrence) => {
    if (!event) return;
    Alert.alert(t('school.event.cancelDateTitle', { date: dayLabel(o.startsAt) }), t('school.event.cancelDateBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('school.event.cancelDate'), style: 'destructive', onPress: () => run(() => schoolService.cancelDate(event.id, o.date)) },
    ]);
  };

  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })} · ${
      d.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}`;
  };

  const cancel = () => {
    if (!event) return;
    Alert.alert(t('school.event.cancelTitle'), t('school.event.cancelBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('school.event.cancel'), style: 'destructive',
        onPress: () => schoolService.cancelEvent(event.id)
          .then(() => navigation.goBack())
          .catch(e => Alert.alert(t('common.error'), getApiError(e))),
      },
    ]);
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="chevron-back" size={26} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );

  if (error || !event) {
    return (
      <SafeAreaView style={styles.safe}>
        <FloatingBackground />
        {header}
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />}
      </SafeAreaView>
    );
  }

  const left = event.maxParticipants != null ? Math.max(0, event.maxParticipants - event.participantCount) : null;
  const photoW = width - 40;
  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />
      {header}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {event.photos.length > 0 && (
          <FlatList
            data={event.photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={p => String(p.id)}
            renderItem={({ item }) => <RemoteImage source={{ uri: item.url }} style={[styles.photo, { width: photoW }]} />}
            style={styles.photos}
          />
        )}
        {event.cancelled && (
          <View style={styles.cancelled}><Text style={styles.cancelledText}>{t('school.event.cancelled')}</Text></View>
        )}
        <Text style={styles.when}>{eventWhen(event, t, i18n.language).main}</Text>
        {eventWhen(event, t, i18n.language).next && (
          <Text style={styles.next}>{eventWhen(event, t, i18n.language).next}</Text>
        )}
        <Text style={styles.title}>{event.title}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SchoolDetail', { schoolId: event.schoolId })}>
          <Text style={styles.school}>{event.schoolName} ›</Text>
        </TouchableOpacity>

        <GlassCard style={styles.card}>
          <Row icon="cash-outline" text={`${formatPrice(event.priceRappen, t('market.free'))}${event.priceRappen ? ` ${t('school.event.perDog')}` : ''}`} />
          <Row
            icon="people-outline"
            text={byDate
              ? (event.maxParticipants != null
                ? t('school.event.placesPerClass', { count: event.maxParticipants })
                : t('school.event.noLimit'))
              : left == null
                ? t('school.event.signedUpCount', { count: event.participantCount })
                : t('school.event.placesLeft', { count: left })}
          />
          {(event.placeName || event.address) && (
            <TouchableOpacity
              disabled={event.latitude == null || event.longitude == null}
              onPress={() => openInMaps(event.latitude!, event.longitude!, event.placeName ?? event.title)}
            >
              <Row icon="location-outline" text={[event.placeName, event.address].filter(Boolean).join(', ')} link />
            </TouchableOpacity>
          )}
        </GlassCard>

        {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

        <Text style={styles.payNote}>{t('school.event.payNote')}</Text>

        {/* The classes to come. Per date: each with its own sign-up and places.
            Course: just the dates, so it is clear what the sign-up covers. */}
        {!!event.occurrences?.length && !event.cancelled && (
          <>
            <Text style={styles.section}>{t(byDate ? 'school.event.pickDates' : 'school.event.dates')}</Text>
            {isCourse && !event.mine && (
              <Text style={styles.courseNote}>
                {t('school.event.courseNote', { count: Math.max(0, (event.remainingClasses ?? 0) - 1) })}
              </Text>
            )}
            {event.occurrences.map(o => {
              const placesLeft = byDate && event.maxParticipants != null ? Math.max(0, event.maxParticipants - o.participantCount) : null;
              return (
                <View key={o.date} style={styles.dateRow} testID={`event-date-${o.date}`}>
                  <View style={styles.dateText}>
                    <Text style={styles.dateLabel}>{dayLabel(o.startsAt)}</Text>
                    {byDate && (
                      <Text style={styles.dateSub}>
                        {event.mine
                          ? t('school.event.signedUpCount', { count: o.participantCount })
                          : placesLeft != null ? t('school.event.placesLeft', { count: placesLeft }) : ''}
                      </Text>
                    )}
                  </View>
                  {event.mine ? (
                    <TouchableOpacity onPress={() => cancelOneDate(o)} disabled={busy} hitSlop={8}>
                      <Text style={styles.dangerText}>{t('school.event.cancelDate')}</Text>
                    </TouchableOpacity>
                  ) : byDate && (
                    <TouchableOpacity
                      style={[styles.dateBtn, o.joined && styles.dateBtnJoined, !o.joined && o.full && styles.dateBtnFull]}
                      onPress={() => toggleDate(o)}
                      disabled={busy || (!o.joined && o.full)}
                      testID={`event-join-${o.date}`}
                    >
                      <Text style={[styles.dateBtnText, o.joined && styles.dateBtnTextJoined]}>
                        {o.joined ? `✓ ${t('school.event.signedUp')}` : o.full ? t('school.event.full') : t('school.event.join')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </>
        )}

        {event.mine ? (
          <>
            <View style={styles.ownerRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('EditEvent', { eventId: event.id })}>
                <Text style={styles.secondaryText}>{t('school.event.edit')}</Text>
              </TouchableOpacity>
              {!event.cancelled && (
                <TouchableOpacity style={styles.dangerBtn} onPress={cancel}>
                  <Text style={styles.dangerText}>{t('school.event.cancel')}</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.section}>{t('school.event.participants', { count: people.length })}</Text>
            {people.map((p, i) => (
              <View key={`${p.userId}-${p.occurrenceDate ?? 'all'}`}>
                {/* Per date, grouped under each class. */}
                {p.occurrenceDate && p.occurrenceDate !== people[i - 1]?.occurrenceDate && (
                  <Text style={styles.groupLabel}>
                    {new Date(`${p.occurrenceDate}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </Text>
                )}
                <TouchableOpacity style={styles.person} onPress={() => navigation.navigate('UserProfile', { userId: p.userId })}>
                  {p.profilePicture
                    ? <RemoteImage source={{ uri: p.profilePicture }} style={styles.avatar} />
                    : <View style={[styles.avatar, styles.noAvatar]}><Text>🐶</Text></View>}
                  <Text style={styles.personName}>{p.name}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        ) : !event.cancelled && !byDate && (
          <TouchableOpacity
            style={[styles.primaryBtn, event.joined && styles.leaveBtn]}
            onPress={toggle}
            disabled={busy || (!event.joined && left === 0)}
            testID="event-join"
          >
            {busy ? <ActivityIndicator color="#fff" /> : (
              <Text style={[styles.primaryText, event.joined && styles.leaveText]}>
                {event.joined ? t('school.event.leave') : left === 0 ? t('school.event.full') : t('school.event.join')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, text, link }: Readonly<{ icon: keyof typeof Ionicons.glyphMap; text: string; link?: boolean }>) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Text style={[styles.rowText, link && styles.link]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  error:  { textAlign: 'center', color: Colors.textSecondary, marginTop: 40, paddingHorizontal: 30 },
  photos: { borderRadius: 16, marginBottom: 14 },
  photo:  { height: 220, borderRadius: 16 },
  cancelled: { alignSelf: 'flex-start', backgroundColor: 'rgba(229,62,62,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  cancelledText: { color: Colors.error, fontWeight: '700', fontSize: 12 },
  when:   { fontSize: 14, fontWeight: '700', color: Colors.primary },
  next:   { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  title:  { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 4 },
  school: { fontSize: 15, color: Colors.primary, fontWeight: '600', marginTop: 4, marginBottom: 14 },
  card:   { marginBottom: 14, gap: 10 },
  row:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1, fontSize: 15, color: Colors.text },
  link:   { color: Colors.primary },
  description: { fontSize: 15, color: Colors.text, lineHeight: 22, marginBottom: 12 },
  payNote: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 16 },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  leaveBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.error },
  leaveText: { color: Colors.error },
  ownerRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  secondaryText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
  dangerBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.error, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  dangerText: { color: Colors.error, fontSize: 15, fontWeight: '700' },
  courseNote: { fontSize: 14, color: Colors.text, lineHeight: 20, marginBottom: 10, fontWeight: '600' },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  dateText: { flex: 1 },
  dateLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  dateSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  dateBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  dateBtnJoined: { backgroundColor: 'rgba(46,158,107,0.12)' },
  dateBtnFull: { backgroundColor: Colors.border },
  dateBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  dateBtnTextJoined: { color: Colors.primary },
  groupLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 10, marginBottom: 2 },
  section: { fontSize: 16, fontWeight: '800', color: Colors.text, marginTop: 20, marginBottom: 8 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  noAvatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46,158,107,0.12)' },
  personName: { fontSize: 15, color: Colors.text, fontWeight: '600' },
});
