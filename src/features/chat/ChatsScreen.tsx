import { useCallback, useRef, useState } from 'react';
import {
  FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { chatService, MatchSummary } from '../../services/chatService';
import { chatSocket } from '../../services/socket';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';

const POLL_MS = 8000;
// With a live socket, polling is only a safety net every SLOW_POLL_TICKS * POLL_MS
const SLOW_POLL_TICKS = 4;

function formatWhen(iso: string | null, t: TFunction): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return t('chat.chatsScreen.timeNow');
  if (mins < 60) return t('chat.chatsScreen.timeMinutes', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('chat.chatsScreen.timeHours', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('chat.chatsScreen.timeDays', { count: days });
  return new Date(iso).toLocaleDateString();
}

export default function ChatsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    chatService.getMatches()
      .then(data => { setMatches(data); setError(null); })
      .catch(() => setError(t('chat.chatsScreen.loadError')))
      .finally(() => { setLoaded(true); setRefreshing(false); });
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
      // Any live event (new message or match) can change the list and its ordering
      const unsubscribe = chatSocket.subscribe(() => load());
      let tick = 0;
      pollRef.current = setInterval(() => {
        tick++;
        if (!chatSocket.isConnected() || tick % SLOW_POLL_TICKS === 0) load();
      }, POLL_MS);
      return () => {
        unsubscribe();
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [load])
  );

  const openChat = (m: MatchSummary) => {
    navigation.navigate('ChatDetail', {
      matchId: m.matchId,
      otherUserId: m.otherUserId,
      name: m.otherUserName,
      profilePicture: m.otherUserProfilePicture,
    });
  };

  const renderItem = ({ item }: { item: MatchSummary }) => {
    const isNew = item.lastMessageContent === null;
    const lastIsMine = item.lastMessageSenderId !== null && item.lastMessageSenderId !== item.otherUserId;

    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => openChat(item)}>
        <GlassCard padding={0} style={styles.card}>
          <View style={styles.row}>
            {item.otherUserProfilePicture
          ? <Image source={{ uri: item.otherUserProfilePicture }} style={styles.avatar} />
          : <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 24 }}>🐶</Text></View>
        }
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.name} numberOfLines={1}>{item.otherUserName}</Text>
            <Text style={styles.when}>{formatWhen(item.lastMessageSentAt ?? item.matchedAt, t)}</Text>
          </View>
          {isNew ? (
            <View style={styles.newMatchRow}>
              <Text style={styles.newMatchText}>{t('chat.chatsScreen.youMatched')}</Text>
              <View style={styles.chatNowPill}>
                <Text style={styles.chatNowText}>{t('chat.chatsScreen.chatNow')}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.rowTop}>
              <Text
                style={[styles.preview, item.unreadCount > 0 && styles.previewUnread]}
                numberOfLines={1}
              >
                {lastIsMine ? t('chat.chatsScreen.youPrefix') : ''}{item.lastMessageContent}
              </Text>
              {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          )}
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('chat.chatsScreen.headerTitle')}</Text>
      </View>

      <FlatList
        data={matches}
        keyExtractor={m => String(m.matchId)}
        renderItem={renderItem}
        contentContainerStyle={matches.length === 0 ? styles.emptyContainer : styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          !loaded ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{error ? '⚠️' : '💬'}</Text>
              <Text style={styles.emptyTitle}>{error ? t('chat.chatsScreen.errorTitle') : t('chat.chatsScreen.noMatchesTitle')}</Text>
              <Text style={styles.emptySub}>
                {error ?? t('chat.chatsScreen.noMatchesSub')}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },

  listContainer:  { paddingHorizontal: 16, paddingBottom: 120 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },

  card: { marginBottom: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
  },
  avatar:            { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },

  rowBody: { flex: 1, marginLeft: 12 },
  rowTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name:    { fontSize: 16, fontWeight: '700', color: Colors.text, flexShrink: 1 },
  when:    { fontSize: 12, color: Colors.textSecondary },

  newMatchRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  newMatchText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  chatNowPill:  { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  chatNowText:  { color: '#fff', fontSize: 12, fontWeight: '700' },

  preview:       { fontSize: 14, color: Colors.textSecondary, flex: 1, marginTop: 3 },
  previewUnread: { color: Colors.text, fontWeight: '700' },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  empty:      { alignItems: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  emptySub:   { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
});
