import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../components/GlassCard';
import { Colors } from '../../constants/colors';
import { playdateService, Playdate } from '../../services/playdateService';
import { getApiError } from '../../utils/apiError';

interface Props {
  playdateId: number;
  /** The invite text as sent — shown on its own when the walk can't be loaded. */
  content: string;
  /** Whether the signed-in user sent this invite. */
  mine: boolean;
  otherName: string;
  maxWidth: number;
  onOpen: (playdateId: number) => void;
}

/**
 * A walk invite in a chat: where, when, and whether it is on.
 *
 * <p>The walk is fetched rather than read from the message, for the same reason
 * sitting offers are: the card should say what is true now. An invite accepted
 * yesterday must not still be asking for an answer.
 */
export function WalkInviteCard({ playdateId, content, mine, otherName, maxWidth, onOpen }: Readonly<Props>) {
  const { t, i18n } = useTranslation();
  const [walk, setWalk] = useState<Playdate | null>(null);
  // The server stops showing an invite-only walk to someone who declined or left,
  // so "can't load it" is a real state of the card, not only an error.
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    playdateService.getPlaydate(playdateId)
      .then(p => { setWalk(p); setGone(false); })
      .catch(() => setGone(true));
  }, [playdateId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const respond = async (accept: boolean) => {
    setBusy(true);
    try {
      if (accept) setWalk(await playdateService.join(playdateId));
      else { await playdateService.leave(playdateId); setGone(true); }
    } catch (e) {
      Alert.alert(t('common.error'), getApiError(e));
      load();
    } finally {
      setBusy(false);
    }
  };

  const startsAt = walk ? new Date(walk.startsAt) : null;
  const past = startsAt != null && startsAt.getTime() < Date.now();
  const cancelled = walk?.status === 'CANCELLED';
  const guest = walk?.participants?.find(p => p.status !== 'HOST');

  let state: string | null = null;
  if (gone) state = t(mine ? 'walk.state.unavailable' : 'walk.state.declinedByMe');
  else if (cancelled) state = t('walk.state.cancelled');
  else if (past) state = t('walk.state.past');
  else if (walk && mine) {
    if (guest?.status === 'JOINED') state = t('walk.state.theyAreComing', { name: otherName });
    else if (guest?.status === 'INVITED') state = t('walk.state.waiting', { name: otherName });
    else state = t('walk.state.theyDeclined', { name: otherName });
  } else if (walk?.myStatus === 'JOINED') state = t('walk.state.youAreGoing');

  const canAnswer = !mine && walk?.myStatus === 'INVITED' && !cancelled && !past;

  return (
    <GlassCard padding={12} radius={16} compact style={{ maxWidth }}>
      <TouchableOpacity activeOpacity={0.7} disabled={!walk} onPress={() => onOpen(playdateId)}>
        <View style={styles.head}>
          <Text style={styles.paw}>🐾</Text>
          <Text style={styles.label}>{t('walk.cardLabel')}</Text>
        </View>

        {walk && startsAt ? (
          <>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={14} color={Colors.primary} />
              <Text style={styles.detail}>{walk.parkName}</Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="time-outline" size={14} color={Colors.primary} />
              <Text style={styles.detail}>
                {startsAt.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })}
                {', '}
                {startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {walk.description ? <Text style={styles.note}>{walk.description}</Text> : null}
          </>
        ) : (
          <Text style={styles.detail}>{content}</Text>
        )}
      </TouchableOpacity>

      {canAnswer && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.decline]} disabled={busy} onPress={() => respond(false)}>
            <Text style={styles.declineText}>{t('walk.decline')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.accept]} disabled={busy} onPress={() => respond(true)}>
            {busy
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.acceptText}>{t('walk.accept')}</Text>}
          </TouchableOpacity>
        </View>
      )}

      {state && <Text style={styles.state}>{state}</Text>}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  head:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  paw:    { fontSize: 14 },
  label:  { fontSize: 11, fontWeight: '800', color: Colors.primary, letterSpacing: 0.4, textTransform: 'uppercase' },
  row:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  detail: { flexShrink: 1, fontSize: 15, color: Colors.text },
  note:   { marginTop: 8, fontSize: 14, color: Colors.textSecondary },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  button: {
    flex: 1, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  accept:      { backgroundColor: Colors.primary },
  acceptText:  { color: '#fff', fontSize: 14, fontWeight: '800' },
  decline:     { borderWidth: 1.5, borderColor: Colors.glass.inputBorder },
  declineText: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  state: { marginTop: 8, fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
});
