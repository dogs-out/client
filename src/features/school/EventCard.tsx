import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { GlassCard } from '../../components/GlassCard';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { SchoolEvent } from '../../services/schoolService';
import { formatPrice } from '../../services/marketService';
import { formatDistance } from '../../utils/geo';
import { formatSittingWindow } from '../../utils/sittingWindow';
import type { TFunction } from 'i18next';

/** "Sa, 8. Nov · 10:00–11:30" in the app's language. */
export function formatEventTime(startsAt: string, endsAt: string | null, language: string): string {
  const start = new Date(startsAt);
  const day = start.toLocaleDateString(language, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = (d: Date) => d.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time(start)}${endsAt ? `–${time(new Date(endsAt))}` : ''}`;
}

/** When an event happens: one date, or a course's weekdays with its next class. */
export function eventWhen(event: SchoolEvent, t: TFunction, language: string): { main: string; next?: string } {
  if (event.repeatWeekdays?.length && event.occurrenceMinutes) {
    const next = event.nextStartsAt
      ? new Date(event.nextStartsAt).toLocaleDateString(language, { weekday: 'short', day: 'numeric', month: 'short' })
      : undefined;
    return {
      main: formatSittingWindow({ ...event, endsAt: event.endsAt ?? event.startsAt }, t, language),
      next: next ? t('school.event.nextClass', { date: next }) : undefined,
    };
  }
  return { main: formatEventTime(event.startsAt, event.endsAt, language) };
}


type Props = { event: SchoolEvent; onPress: () => void; showSchool?: boolean };

/** A school event in a list: picture, when, what, where, price, places. */
export function EventCard({ event, onPress, showSchool = true }: Readonly<Props>) {
  const { t, i18n } = useTranslation();
  // Per-date events have places per class, so the event as a whole is never "full".
  const full = event.signupMode !== 'DATE' && event.maxParticipants != null && event.participantCount >= event.maxParticipants;
  const picture = event.photos[0]?.thumbUrl ?? event.schoolLogo;
  const when = eventWhen(event, t, i18n.language);
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} testID={`event-${event.id}`}>
      <GlassCard padding={0} style={styles.card}>
        <View style={styles.row}>
          {picture
            ? <RemoteImage source={{ uri: picture }} style={styles.photo} />
            : <View style={[styles.photo, styles.noPhoto]}><Text style={{ fontSize: 26 }}>🎓</Text></View>}
          <View style={styles.body}>
            <Text style={styles.when}>{when.main}</Text>
            {when.next && <Text style={styles.next}>{when.next}</Text>}
            <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
            {showSchool && <Text style={styles.school} numberOfLines={1}>{event.schoolName}</Text>}
            <View style={styles.metaRow}>
              <Text style={styles.price}>{formatPrice(event.priceRappen, t('market.free'))}</Text>
              {event.distanceKm >= 0 && <Text style={styles.meta}>· {formatDistance(event.distanceKm, t)}</Text>}
              {event.joined && (
                <View style={styles.joined}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                  <Text style={styles.joinedText}>{t('school.event.signedUp')}</Text>
                </View>
              )}
              {!event.joined && full && <Text style={styles.full}>{t('school.event.full')}</Text>}
            </View>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:   { marginBottom: 12 },
  row:    { flexDirection: 'row', padding: 12, gap: 12 },
  photo:  { width: 76, height: 76, borderRadius: 12 },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46,158,107,0.12)' },
  body:   { flex: 1 },
  when:   { fontSize: 12, fontWeight: '700', color: Colors.primary },
  next:   { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  title:  { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 2 },
  school: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  price:  { fontSize: 13, fontWeight: '700', color: Colors.text },
  meta:   { fontSize: 13, color: Colors.textSecondary },
  joined: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  joinedText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  full:   { fontSize: 12, fontWeight: '700', color: Colors.error },
});
