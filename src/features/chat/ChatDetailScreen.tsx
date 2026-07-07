import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal,
  Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import { chatService, ChatMessage } from '../../services/chatService';
import { chatSocket } from '../../services/socket';
import { moderationService } from '../../services/moderationService';
import { containsProfanity } from '../../utils/profanityFilter';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { ReportUserModal } from './ReportUserModal';

const POLL_MS = 3000;
// With a live socket, polling is only a safety net every SLOW_POLL_TICKS * POLL_MS
const SLOW_POLL_TICKS = 10;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

type MenuAction = {
  icon: string;
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

export default function ChatDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ChatDetail'>>();
  const { matchId, otherUserId, name, profilePicture } = params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
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
      setError('Your message contains inappropriate language.');
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
      .catch(err => setError(err?.response?.data?.message ?? 'Message could not be sent.'))
      .finally(() => setSending(false));
  };

  const openProfile = () => {
    setMenuOpen(false);
    navigation.navigate('UserProfile', { userId: otherUserId });
  };

  const blockUser = (thenGoBack = true) => {
    moderationService.blockUser(otherUserId)
      .then(() => {
        Alert.alert('Blocked', `${name} can no longer see you or message you.`);
        if (thenGoBack) navigation.goBack();
      })
      .catch(() => Alert.alert('Error', 'Could not block this user. Please try again.'));
  };

  const confirmBlock = () => {
    setMenuOpen(false);
    Alert.alert(
      `Block ${name}?`,
      'They will disappear from your matches and Discover, and neither of you can message the other. They won’t be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => blockUser() },
      ]
    );
  };

  const confirmUnmatch = () => {
    setMenuOpen(false);
    Alert.alert(
      `Unmatch ${name}?`,
      'This deletes the match and the entire chat for both of you. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmatch', style: 'destructive',
          onPress: () => moderationService.unmatch(matchId)
            .then(() => navigation.goBack())
            .catch(() => Alert.alert('Error', 'Could not unmatch. Please try again.')),
        },
      ]
    );
  };

  const submitReport = (reason: string, message: string) =>
    moderationService.reportUser(matchId, reason, message).then(() => {
      setReportOpen(false);
      Alert.alert(
        'Report sent',
        `Thanks for letting us know. Do you also want to block ${name}?`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: `Block ${name}`, style: 'destructive', onPress: () => blockUser() },
        ]
      );
    });

  const menuActions: MenuAction[] = [
    { icon: 'person-circle-outline', label: 'View profile', onPress: openProfile },
    { icon: 'flag-outline', label: `Report ${name}`, destructive: true, onPress: () => { setMenuOpen(false); setReportOpen(true); } },
    { icon: 'remove-circle-outline', label: `Block ${name}`, destructive: true, onPress: confirmBlock },
    { icon: 'trash-outline', label: 'Unmatch & delete chat', destructive: true, onPress: confirmUnmatch },
  ];

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.senderId !== otherUserId;
    return (
      <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>{item.content}</Text>
        </View>
        <Text style={styles.bubbleTime}>{formatTime(item.sentAt)}</Text>
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
          <TouchableOpacity style={styles.headerIdentity} activeOpacity={0.7} onPress={openProfile}>
            {profilePicture
              ? <Image source={{ uri: profilePicture }} style={styles.headerAvatar} />
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={m => String(m.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatEmoji}>🐾</Text>
                <Text style={styles.emptyChatText}>
                  You matched with {name}! Say hi and plan your first walk together.
                </Text>
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
              placeholder={`Message ${name}…`}
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
              <Text style={styles.menuCancelText}>Cancel</Text>
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
  bubble:          { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMine:      { backgroundColor: 'rgba(46,158,107,0.92)', borderBottomRightRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  bubbleTheirs:    { backgroundColor: Colors.glass.inputBg, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.glass.border },
  bubbleTextMine:   { color: '#fff', fontSize: 15, lineHeight: 20 },
  bubbleTextTheirs: { color: Colors.text, fontSize: 15, lineHeight: 20 },
  bubbleTime:      { fontSize: 10, color: Colors.textSecondary, marginTop: 2, marginHorizontal: 4 },

  // inverted list flips children, so flip the empty state back
  emptyChat:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, transform: [{ scaleY: -1 }] },
  emptyChatEmoji: { fontSize: 48, marginBottom: 12 },
  emptyChatText:  { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

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
