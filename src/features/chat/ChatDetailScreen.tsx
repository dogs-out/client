import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform,
  SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { chatService, ChatMessage } from '../../services/chatService';
import { containsProfanity } from '../../utils/profanityFilter';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';

const POLL_MS = 3000;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ChatDetail'>>();
  const { matchId, otherUserId, name, profilePicture } = params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    chatService.getMessages(matchId)
      .then(data => setMessages([...data].reverse()))  // inverted list wants newest first
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [matchId]);

  useFocusEffect(
    useCallback(() => {
      load();
      pollRef.current = setInterval(load, POLL_MS);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [load])
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
        setDraft('');
        setMessages(prev => [msg, ...prev]);
      })
      .catch(err => setError(err?.response?.data?.message ?? 'Message could not be sent.'))
      .finally(() => setSending(false));
  };

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

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        {profilePicture
          ? <Image source={{ uri: profilePicture }} style={styles.headerAvatar} />
          : <View style={[styles.headerAvatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 18 }}>🐶</Text></View>
        }
        <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
      </View>

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.glass.divider,
  },
  backBtn:      { padding: 6 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
  avatarPlaceholder: { backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerName:   { fontSize: 18, fontWeight: '800', color: Colors.text, flex: 1 },

  listContainer: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },

  bubbleRow:       { marginVertical: 3, maxWidth: '80%' },
  bubbleRowMine:   { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleRowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble:          { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMine:      { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs:    { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.glass.divider },
  bubbleTextMine:   { color: '#fff', fontSize: 15, lineHeight: 20 },
  bubbleTextTheirs: { color: Colors.text, fontSize: 15, lineHeight: 20 },
  bubbleTime:      { fontSize: 10, color: Colors.textSecondary, marginTop: 2, marginHorizontal: 4 },

  // inverted list flips children, so flip the empty state back
  emptyChat:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, transform: [{ scaleY: -1 }] },
  emptyChatEmoji: { fontSize: 48, marginBottom: 12 },
  emptyChatText:  { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  errorText: { color: Colors.error, fontSize: 13, textAlign: 'center', paddingHorizontal: 16, paddingBottom: 4 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 4 : 12,
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
