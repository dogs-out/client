import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking, Modal,
  Platform, Pressable, StyleSheet, Text, TextInput,
  TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { chatService, ChatMessage } from '../../services/chatService';
import { chatSocket } from '../../services/socket';
import { moderationService } from '../../services/moderationService';
import { containsProfanity } from '../../utils/profanityFilter';
import { RootStackParamList } from '../../types/navigation';
import { KEYBOARD_BEHAVIOR } from '../../utils/keyboardBehavior';
import { Colors } from '../../constants/colors';
import { scaledLineHeight } from '../../utils/typography';
import { FloatingBackground } from '../../components/FloatingBackground';
import { discoverService } from '../../services/discoverService';
import { invertedListCounterTransform } from '../../utils/invertedList';
import { GlassCard } from '../../components/GlassCard';
import { ReportUserModal } from '../../components/ReportUserModal';
import { sitterService, SittingRequest } from '../../services/sitterService';
import { openInMaps } from '../../utils/placeAddress';

const POLL_MS = 3000;
// With a live socket, polling is only a safety net every SLOW_POLL_TICKS * POLL_MS
const SLOW_POLL_TICKS = 10;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateLabel(iso: string, t: TFunction, language: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (isSameDay(date, now)) return t('chat.chatDetail.today');
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return t('chat.chatDetail.yesterday');
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(language, sameYear
    ? { day: 'numeric', month: 'long' }
    : { day: 'numeric', month: 'long', year: 'numeric' });
}

type MenuAction = {
  icon: string;
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

type ListItem =
  | { type: 'message'; message: ChatMessage }
  | { type: 'separator'; key: string; label: string };

export default function ChatDetailScreen() {
  const { width } = useWindowDimensions();
  // Points, not a percentage: the bubble has to hand the text a real number to
  // wrap against, or a large system font clips the tail instead of wrapping.
  const bubbleMaxWidth = Math.round(width * 0.76);
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ChatDetail'>>();
  const { matchId, otherUserId, name, profilePicture } = params;
  // Cake, candles and confetti instead of the usual bones and paws, on the day.
  // The server answers with a boolean rather than a date — nobody's birth date
  // needs to travel for the chat to look festive.
  const [celebrating, setCelebrating] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  /**
   * The jobs any offer bubbles in this chat refer to, by id. Fetched rather than
   * carried in the message so the bubble reflects the job as it is now — an offer
   * the owner accepted last week should not still be offering an Accept button.
   */
  const [offerJobs, setOfferJobs] = useState<Record<number, SittingRequest>>({});
  const [accepting, setAccepting] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Bumped on every send so an in-flight poll from before the send
  // can't overwrite the list and briefly swallow the new bubble
  const sendSeqRef = useRef(0);

  const load = useCallback(() => {
    const seq = sendSeqRef.current;
    chatService.getMessages(matchId)
      .then(data => {
        if (seq !== sendSeqRef.current) return; // stale response, a send happened meanwhile
        setMessages([...data].reverse()); // inverted list wants newest first
      })
      .catch(err => {
        // Chat was blocked or unmatched from the other side — leave quietly
        const status = err instanceof AxiosError ? err.response?.status : null;
        if (status === 403 || status === 404) {
          if (pollRef.current) clearInterval(pollRef.current);
          navigation.goBack();
        }
      })
      .finally(() => setLoading(false));
  }, [matchId, navigation]);

  useFocusEffect(
    useCallback(() => {
      load();
      // Live path: reload on socket events for this match (the GET also marks them read)
      const unsubscribe = chatSocket.subscribe(event => {
        if (event.matchId === matchId && event.type === 'NEW_MESSAGE') load();
      });
      let tick = 0;
      pollRef.current = setInterval(() => {
        tick++;
        if (!chatSocket.isConnected() || tick % SLOW_POLL_TICKS === 0) load();
      }, POLL_MS);
      return () => {
        unsubscribe();
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [load, matchId])
  );

  const send = () => {
    const content = draft.trim();
    if (!content || sending) return;
    if (containsProfanity(content)) {
      setError(t('chat.chatDetail.profanity'));
      return;
    }
    setError(null);
    setSending(true);
    chatService.sendMessage(matchId, content)
      .then(msg => {
        sendSeqRef.current++;
        setDraft('');
        setMessages(prev => [msg, ...prev]);
      })
      .catch(err => setError(err?.response?.data?.message ?? t('chat.chatDetail.sendFailed')))
      .finally(() => setSending(false));
  };

  useEffect(() => {
    let stale = false;
    discoverService.getUserProfile(otherUserId)
      .then(p => { if (!stale) setCelebrating(p.celebratingToday); })
      .catch(() => { /* the background simply stays ordinary */ });
    return () => { stale = true; };
  }, [otherUserId]);

  const openProfile = () => {
    setMenuOpen(false);
    navigation.navigate('UserProfile', { userId: otherUserId });
  };

  const blockUser = (thenGoBack = true) => {
    moderationService.blockUser(otherUserId)
      .then(() => {
        Alert.alert(t('chat.chatDetail.blockedTitle'), t('chat.chatDetail.blockedMessage', { name }));
        if (thenGoBack) navigation.goBack();
      })
      .catch(() => Alert.alert(t('common.error'), t('chat.chatDetail.blockError')));
  };

  const confirmBlock = () => {
    setMenuOpen(false);
    Alert.alert(
      t('chat.chatDetail.blockConfirmTitle', { name }),
      t('chat.chatDetail.blockConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('chat.chatDetail.blockAction'), style: 'destructive', onPress: () => blockUser() },
      ]
    );
  };

  const confirmUnmatch = () => {
    setMenuOpen(false);
    Alert.alert(
      t('chat.chatDetail.unmatchConfirmTitle', { name }),
      t('chat.chatDetail.unmatchConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.chatDetail.unmatchAction'), style: 'destructive',
          onPress: () => moderationService.unmatch(matchId)
            .then(() => navigation.goBack())
            .catch(() => Alert.alert(t('common.error'), t('chat.chatDetail.unmatchError'))),
        },
      ]
    );
  };

  const submitReport = (reason: string, message: string) =>
    moderationService.reportUser(matchId, reason, message).then(() => {
      setReportOpen(false);
      Alert.alert(
        t('chat.chatDetail.reportSentTitle'),
        t('chat.chatDetail.reportSentMessage', { name }),
        [
          { text: t('chat.chatDetail.notNow'), style: 'cancel' },
          { text: t('chat.chatDetail.blockName', { name }), style: 'destructive', onPress: () => blockUser() },
        ]
      );
    });

  const menuActions: MenuAction[] = [
    { icon: 'person-circle-outline', label: t('chat.chatDetail.viewProfile'), onPress: openProfile },
    { icon: 'flag-outline', label: t('chat.chatDetail.reportName', { name }), destructive: true, onPress: () => { setMenuOpen(false); setReportOpen(true); } },
    { icon: 'remove-circle-outline', label: t('chat.chatDetail.blockName', { name }), destructive: true, onPress: confirmBlock },
    { icon: 'trash-outline', label: t('chat.chatDetail.unmatchDeleteChat'), destructive: true, onPress: confirmUnmatch },
  ];

  // messages is newest-first; insert one date separator after the oldest message of each
  // calendar day so it lands visually above that day's block in the inverted FlatList
  const listData = useMemo<ListItem[]>(() => {
    const result: ListItem[] = [];
    messages.forEach((message, i) => {
      result.push({ type: 'message', message });
      const next = messages[i + 1];
      const isLastOfDay = !next || !isSameDay(new Date(message.sentAt), new Date(next.sentAt));
      if (isLastOfDay) {
        result.push({ type: 'separator', key: `sep-${message.sentAt}`, label: formatDateLabel(message.sentAt, t, i18n.language) });
      }
    });
    return result;
  }, [messages, t, i18n.language]);

  const offerIds = useMemo(
    () => [...new Set(messages.map(m => m.sittingRequestId).filter((id): id is number => id != null))],
    [messages]);

  /**
   * Both sides of the job board, because either party may be looking: the owner
   * finds the job under their own requests, the sitter under the jobs they were
   * accepted for. One of the two calls covers whoever is reading.
   */
  const loadOfferJobs = useCallback(() => {
    if (offerIds.length === 0) return;
    Promise.all([
      sitterService.getMyRequests().catch(() => []),
      sitterService.getAcceptedJobs().catch(() => []),
      sitterService.getOpenRequests().catch(() => []),
    ]).then(lists => {
      const byId: Record<number, SittingRequest> = {};
      for (const job of lists.flat()) {
        if (offerIds.includes(job.id)) byId[job.id] = job;
      }
      setOfferJobs(byId);
    });
  }, [offerIds]);

  useEffect(() => { loadOfferJobs(); }, [loadOfferJobs]);

  const acceptOffer = async (requestId: number, sitterId: number) => {
    setAccepting(requestId);
    try {
      const updated = await sitterService.accept(requestId, sitterId);
      setOfferJobs(prev => ({ ...prev, [requestId]: updated }));
    } catch (e) {
      const message = e instanceof AxiosError
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      Alert.alert(t('sitter.offer.acceptFailedTitle'), message ?? t('sitter.offer.acceptFailedBody'));
      // Whatever went wrong, the job has moved on — show what it says now.
      loadOfferJobs();
    } finally {
      setAccepting(null);
    }
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'separator') {
      return (
        <View style={styles.dateSeparatorRow}>
          <View style={styles.dateSeparatorPill}>
            <Text style={styles.dateSeparatorText}>{item.label}</Text>
          </View>
        </View>
      );
    }
    const message = item.message;
    const mine = message.senderId !== otherUserId;

    // A sitter's offer on a job. The owner gets a bubble they can accept from;
    // the sitter sees their own offer with its state, so "did that go through?"
    // is answered without leaving the conversation.
    // The owner's handover card: what the sitter needs on the doorstep, sitting
    // in the conversation where they will look for it.
    if (message.sittingRequestId && message.sittingDetails) {
      const job = offerJobs[message.sittingRequestId];
      return (
        <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
          <GlassCard padding={12} radius={16} compact style={{ maxWidth: bubbleMaxWidth }}>
            <View style={styles.offerHead}>
              <Ionicons name="clipboard-outline" size={15} color={Colors.primary} />
              <Text style={styles.offerLabel}>{t('sitter.details.cardLabel')}</Text>
            </View>

            {job?.addressLabel ? (
              <TouchableOpacity
                style={styles.detailRow}
                disabled={job.addressLatitude == null}
                onPress={() => openInMaps({
                  parkName: job.addressLabel!,
                  address: job.addressLabel,
                  latitude: job.addressLatitude!,
                  longitude: job.addressLongitude!,
                })}
              >
                <Ionicons name="location-outline" size={14} color={Colors.primary} />
                <Text style={[styles.detailText, job.addressLatitude != null && styles.detailLink]}>
                  {job.addressLabel}
                </Text>
              </TouchableOpacity>
            ) : null}

            {job?.emergencyPhone ? (
              <TouchableOpacity style={styles.detailRow} onPress={() => Linking.openURL(`tel:${job.emergencyPhone}`)}>
                <Ionicons name="call-outline" size={14} color={Colors.primary} />
                <Text style={[styles.detailText, styles.detailLink]}>{job.emergencyPhone}</Text>
              </TouchableOpacity>
            ) : null}

            {job?.todoList ? (
              <View style={styles.todoBox}>
                {job.todoList.split('\n').filter(l => l.trim()).map((line, i) => (
                  <View key={i} style={styles.todoLine}>
                    <Text style={styles.todoBullet}>•</Text>
                    <Text style={styles.todoText}>{line.trim()}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* The job is only fetched for the two people involved, so anyone
                else sees the plain sentence rather than an empty card. */}
            {!job && <Text style={styles.bubbleText}>{message.content}</Text>}
          </GlassCard>
          <Text style={styles.bubbleTime} numberOfLines={1}>{formatTime(message.sentAt)}</Text>
        </View>
      );
    }

    if (message.sittingRequestId) {
      const job = offerJobs[message.sittingRequestId];
      const takenByMe = job?.sitterId != null && job.sitterId === message.senderId;
      const canAccept = !mine && job != null && job.sitterId == null && !job.over;
      return (
        <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
          <GlassCard padding={12} radius={16} compact style={{ maxWidth: bubbleMaxWidth }}>
            <View style={styles.offerHead}>
              <Ionicons name="paw" size={15} color={Colors.primary} />
              <Text style={styles.offerLabel}>{t('sitter.offer.label')}</Text>
            </View>
            <Text style={styles.bubbleText}>{message.content}</Text>

            {canAccept && (
              <TouchableOpacity
                style={styles.offerAccept}
                onPress={() => acceptOffer(message.sittingRequestId!, message.senderId)}
                disabled={accepting === message.sittingRequestId}
              >
                {accepting === message.sittingRequestId
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.offerAcceptText}>{t('sitter.offer.accept')}</Text>}
              </TouchableOpacity>
            )}

            {takenByMe && (
              <Text style={styles.offerState}>{t('sitter.offer.accepted')}</Text>
            )}
            {job != null && job.sitterId != null && !takenByMe && (
              <Text style={styles.offerState}>{t('sitter.offer.wentToSomeoneElse')}</Text>
            )}
            {job != null && job.sitterId == null && job.over && (
              <Text style={styles.offerState}>{t('sitter.offer.expired')}</Text>
            )}
          </GlassCard>
          <Text style={styles.bubbleTime} numberOfLines={1}>{formatTime(message.sentAt)}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
        {/* A width in points, on the bubble itself. The row's maxWidth is a
            percentage, and a percentage resolved through a card that sizes to its
            own content gave the text nothing definite to wrap against: at a large
            system font the text measured narrower than it drew, the card took the
            smaller number, and the card clips its corners — so "Das hat jetzt
            funktioniert" was cut to "Das hat jetzt" rather than wrapping. */}
        <GlassCard padding={10} radius={16} compact style={{ maxWidth: bubbleMaxWidth }}>
          <Text style={styles.bubbleText}>{message.content}</Text>
        </GlassCard>
        <Text style={styles.bubbleTime} numberOfLines={1}>{formatTime(message.sentAt)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* undefined rather than 'default': on your own birthday the background
          celebrates everywhere, and an explicit 'default' would switch it off. */}
      <FloatingBackground variant={celebrating ? 'birthday' : undefined} />

      {/* Floating glass header */}
      <BlurView intensity={60} tint="light" style={styles.headerBlur}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIdentity} activeOpacity={0.7} onPress={openProfile}>
            {profilePicture
              ? <RemoteImage source={{ uri: profilePicture }} style={styles.headerAvatar} />
              : <View style={[styles.headerAvatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 18 }}>🐶</Text></View>
            }
            <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
            <Ionicons name="ellipsis-horizontal" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </BlurView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={KEYBOARD_BEHAVIOR}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : (
          <FlatList
            data={listData}
            inverted
            keyExtractor={item => item.type === 'separator' ? item.key : String(item.message.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <GlassCard style={styles.emptyChatCard}>
                  <Text style={styles.emptyChatEmoji}>🐾</Text>
                  <Text style={styles.emptyChatText}>
                    {t('chat.chatDetail.emptyChatText', { name })}
                  </Text>
                </GlassCard>
              </View>
            }
          />
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Floating glass input bar */}
        <BlurView intensity={60} tint="light" style={styles.inputBlur}>
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={t('chat.chatDetail.messagePlaceholder', { name })}
              placeholderTextColor={Colors.textSecondary}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
              onPress={send}
              disabled={!draft.trim() || sending}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </BlurView>
      </KeyboardAvoidingView>

      {/* Action menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
        <View style={styles.menuSheetWrap} pointerEvents="box-none">
          <BlurView intensity={80} tint="light" style={styles.menuSheet}>
            <View style={styles.menuSheetInner}>
              {menuActions.map((action, i) => (
                <TouchableOpacity
                  key={action.label}
                  style={[styles.menuRow, i < menuActions.length - 1 && styles.menuRowBorder]}
                  onPress={action.onPress}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={20}
                    color={action.destructive ? Colors.error : Colors.text}
                  />
                  <Text style={[styles.menuLabel, action.destructive && styles.menuLabelDestructive]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </BlurView>
          <BlurView intensity={80} tint="light" style={[styles.menuSheet, styles.menuCancel]}>
            <TouchableOpacity style={styles.menuCancelBtn} onPress={() => setMenuOpen(false)}>
              <Text style={styles.menuCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>

      <ReportUserModal
        visible={reportOpen}
        name={name}
        onClose={() => setReportOpen(false)}
        onSubmit={submitReport}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerBlur: {
    marginHorizontal: 12, marginTop: 4,
    borderRadius: 22, overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.glass.border,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 8,
    backgroundColor: Colors.glass.overlay,
  },
  backBtn:        { padding: 6 },
  headerIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar:   { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
  avatarPlaceholder: { backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerName:     { fontSize: 18, fontWeight: '800', color: Colors.text, flexShrink: 1 },
  menuBtn:        { padding: 8 },

  listContainer: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },

  bubbleRow:       { marginVertical: 3, maxWidth: '80%' },
  bubbleRowMine:   { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleRowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  // No lineHeight on purpose. A fixed one — even scaled — is read once when the
  // stylesheet is built, and Android does not reliably restart the JS context when
  // the text-size setting changes, so it can be a scale behind the font actually
  // being drawn. Inside a bubble that clips its corners, "a bit too short" shows up
  // as sliced-off descenders. Letting the platform derive it from the (already
  // scaled) font size cannot go stale.
  // flexShrink so the text yields to the bubble's width rather than the bubble
  // being dragged wider than the constraint and then clipped.
  bubbleText: { color: Colors.text, fontSize: 15, flexShrink: 1 },

  // ─── Sitting offer bubbles ─────────────────────────────────────────────────
  offerHead:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  offerLabel: {
    fontSize: 11, fontWeight: '800', color: Colors.primary,
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  offerAccept: {
    marginTop: 10, paddingVertical: 9, paddingHorizontal: 14,
    borderRadius: 13, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  offerAcceptText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  offerState: { marginTop: 8, fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  detailRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  detailText: { flex: 1, fontSize: 14, color: Colors.text },
  detailLink: { color: Colors.primary, fontWeight: '700' },
  todoBox:    { marginTop: 10, gap: 4 },
  todoLine:   { flexDirection: 'row', gap: 6 },
  todoBullet: { fontSize: 14, color: Colors.primary, lineHeight: 20 },
  todoText:   { flex: 1, fontSize: 14, color: Colors.text, lineHeight: 20 },
  // A little breathing room either side: at a large font the clock string
  // drew wider than it measured and lost its last digit — 18:13 became 18:1.
  bubbleTime:      { fontSize: 10, color: Colors.textSecondary, marginTop: 2, marginHorizontal: 4, paddingHorizontal: 2 },

  dateSeparatorRow:  { alignItems: 'center', marginVertical: 12 },
  dateSeparatorPill: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
    backgroundColor: Colors.glass.inputBg, borderWidth: 1, borderColor: Colors.glass.border,
  },
  dateSeparatorText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },

  // Inverted list flips children, so flip the empty state back (per-platform,
  // see invertedListCounterTransform).
  emptyChat:      {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
    transform: invertedListCounterTransform(),
  },
  emptyChatCard:  { alignItems: 'center' },
  emptyChatEmoji: { fontSize: 48, marginBottom: 12 },
  emptyChatText:  { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: scaledLineHeight(22) },

  errorText: { color: Colors.error, fontSize: 13, textAlign: 'center', paddingHorizontal: 16, paddingBottom: 4 },

  inputBlur: {
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'ios' ? 4 : 12,
    borderRadius: 26, overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.glass.border,
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: Colors.glass.overlay,
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 120,
    backgroundColor: Colors.glass.inputBg,
    borderWidth: 1, borderColor: Colors.glass.inputBorder,
    borderRadius: 21, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: Colors.text,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  menuBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(13,40,24,0.40)' },
  menuSheetWrap: {
    position: 'absolute', left: 16, right: 16,
    bottom: Platform.OS === 'ios' ? 40 : 24,
  },
  menuSheet: {
    borderRadius: 22, overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.glass.border,
  },
  menuSheetInner: { backgroundColor: Colors.glass.overlay },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 15,
  },
  menuRowBorder:        { borderBottomWidth: 1, borderBottomColor: Colors.glass.divider },
  menuLabel:            { fontSize: 16, fontWeight: '600', color: Colors.text },
  menuLabelDestructive: { color: Colors.error },
  menuCancel:    { marginTop: 10 },
  menuCancelBtn: { alignItems: 'center', paddingVertical: 15, backgroundColor: Colors.glass.overlay },
  menuCancelText: { fontSize: 16, fontWeight: '800', color: Colors.text },
});
