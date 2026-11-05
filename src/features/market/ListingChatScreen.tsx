import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { ListingConversation, ListingMessage, marketService } from '../../services/marketService';
import { userService } from '../../services/userService';
import { chatSocket } from '../../services/socket';
import { containsProfanity } from '../../utils/profanityFilter';
import { RootStackParamList } from '../../types/navigation';
import { KEYBOARD_BEHAVIOR } from '../../utils/keyboardBehavior';
import { Colors } from '../../constants/colors';
import { scaledLineHeight } from '../../utils/typography';
import { FloatingBackground } from '../../components/FloatingBackground';
import { invertedListCounterTransform } from '../../utils/invertedList';
import { GlassCard } from '../../components/GlassCard';

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

type ListItem =
  | { type: 'message'; message: ListingMessage }
  | { type: 'separator'; key: string; label: string };

type Props = NativeStackScreenProps<RootStackParamList, 'ListingChat'>;

/**
 * A buyer and a seller about one listing. Built like the playdate chat, but 1:1 and
 * deliberately not a match chat: no match is created, so nothing a match unlocks
 * (walk statuses, invites) comes with asking about a lead.
 */
export default function ListingChatScreen({ navigation, route }: Readonly<Props>) {
  const { width } = useWindowDimensions();
  /** Points, not a percentage — see ChatDetailScreen. */
  const bubbleMaxWidth = Math.round(width * 0.76);
  const { t, i18n } = useTranslation();
  const { conversationId } = route.params;

  const [messages, setMessages] = useState<ListingMessage[]>([]);
  const [myId, setMyId] = useState<number | null>(null);
  const [conversation, setConversation] = useState<ListingConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Bumped on every send so an in-flight poll from before the send
  // can't overwrite the list and briefly swallow the new bubble
  const sendSeqRef = useRef(0);

  const load = useCallback(() => {
    const seq = sendSeqRef.current;
    marketService.messages(conversationId)
      .then(data => {
        if (seq !== sendSeqRef.current) return; // stale response, a send happened meanwhile
        setMessages([...data].reverse()); // inverted list wants newest first
      })
      .catch(err => {
        // Listing deleted or the other side gone — leave quietly
        const status = err instanceof AxiosError ? err.response?.status : null;
        if (status === 403 || status === 404) {
          if (pollRef.current) clearInterval(pollRef.current);
          navigation.goBack();
        }
      })
      .finally(() => setLoading(false));
  }, [conversationId, navigation]);

  useFocusEffect(
    useCallback(() => {
      load();
      userService.getMe().then(me => setMyId(me.id)).catch(() => {});
      marketService.conversation(conversationId).then(setConversation).catch(() => {});
      const unsubscribe = chatSocket.subscribe(event => {
        if (event.type === 'LISTING_MESSAGE' && event.conversationId === conversationId) load();
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
    }, [load, conversationId])
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
    marketService.send(conversationId, content)
      .then(msg => {
        sendSeqRef.current++;
        setDraft('');
        setMessages(prev => [msg, ...prev]);
      })
      .catch(err => setError(err?.response?.data?.message ?? t('chat.chatDetail.sendFailed')))
      .finally(() => setSending(false));
  };

  // messages is newest-first
  const listData = useMemo<ListItem[]>(() => {
    const result: ListItem[] = [];
    messages.forEach((message, i) => {
      const next = messages[i + 1]; // chronologically previous message
      const isLastOfDay = !next || !isSameDay(new Date(message.sentAt), new Date(next.sentAt));
      result.push({ type: 'message', message });
      if (isLastOfDay) {
        result.push({ type: 'separator', key: `sep-${message.sentAt}-${message.id}`, label: formatDateLabel(message.sentAt, t, i18n.language) });
      }
    });
    return result;
  }, [messages, t, i18n.language]);

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
    const mine = message.senderId === myId;
    return (
      <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
        {/* See ChatDetailScreen: a percentage maxWidth on the row gave the text
            nothing definite to wrap against, and the card clips its corners. */}
        <GlassCard padding={10} radius={16} compact style={{ maxWidth: bubbleMaxWidth }}>
          <Text style={styles.bubbleText}>{message.content}</Text>
        </GlassCard>
        <Text style={styles.bubbleTime} numberOfLines={1}>{formatTime(message.sentAt)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      {/* Floating glass header */}
      <BlurView intensity={60} tint="light" style={styles.headerBlur}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIdentity}
            activeOpacity={0.7}
            disabled={!conversation}
            onPress={() => conversation && navigation.navigate('ListingDetail', { listingId: conversation.listingId })}
          >
            {conversation?.listingPhoto
              ? <RemoteImage source={{ uri: conversation.listingPhoto }} style={styles.headerPhoto} />
              : <View style={styles.headerIcon}><Ionicons name="pricetag" size={18} color={Colors.primary} /></View>}
            <View style={styles.headerText}>
              <Text style={styles.headerName} numberOfLines={1}>{conversation?.listingTitle ?? ''}</Text>
              {conversation && (
                <Text style={styles.headerSub} numberOfLines={1}>
                  {conversation.otherName}
                  {conversation.listingStatus === 'SOLD' ? ` · ${t('market.status.SOLD')}` : ''}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <View style={{ width: 38 }} />
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
                    {t(conversation?.iAmSeller ? 'market.chat.emptySeller' : 'market.chat.emptyBuyer')}
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
              placeholder={t('market.chat.placeholder')}
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
  headerIcon:     {
    width: 38, height: 38, borderRadius: 19, marginRight: 10,
    backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  headerPhoto:    { width: 38, height: 38, borderRadius: 10, marginRight: 10 },
  headerText:     { flex: 1 },
  headerName:     { fontSize: 16, fontWeight: '800', color: Colors.text, flexShrink: 1 },
  headerSub:      { fontSize: 12, color: Colors.textSecondary },

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
  bubbleText: { color: Colors.text, fontSize: 15, flexShrink: 1 },
  bubbleTime: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, marginHorizontal: 4, paddingHorizontal: 2 },

  dateSeparatorRow:  { alignItems: 'center', marginVertical: 12 },
  dateSeparatorPill: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
    backgroundColor: Colors.glass.inputBg, borderWidth: 1, borderColor: Colors.glass.border,
  },
  dateSeparatorText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },

  // Inverted list flips children, so flip the empty state back (per-platform,
  // see invertedListCounterTransform).
  emptyChat: {
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
});
