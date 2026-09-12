import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { chatService, MatchSummary } from '../../services/chatService';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { GlassButton } from '../../components/GlassButton';
import { Colors } from '../../constants/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Empty means everyone — the server reads it the same way. */
  onSend: (userIds: number[]) => void;
  sending: boolean;
}

/**
 * Who to tell that you are out.
 *
 * <p>Everyone is the default and the first thing on screen, because that is what
 * the invite was for. Picking a few is for the evenings when you want one person
 * to come along rather than announcing yourself to everybody you have matched with.
 */
export function InvitePicker({ visible, onClose, onSend, sending }: Readonly<Props>) {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    if (!visible) return;
    setSelected([]);
    setLoading(true);
    chatService.getMatches()
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [visible]);

  const toggle = (userId: number) =>
    setSelected(prev => prev.includes(userId)
      ? prev.filter(id => id !== userId)
      : [...prev, userId]);

  const renderMatch = ({ item }: { item: MatchSummary }) => {
    const picked = selected.includes(item.otherUserId);
    return (
      <TouchableOpacity style={styles.row} onPress={() => toggle(item.otherUserId)}>
        {item.otherUserProfilePicture
          ? <RemoteImage source={{ uri: item.otherUserProfilePicture }} style={styles.avatar} />
          : <View style={[styles.avatar, styles.avatarPlaceholder]}><Text>🐶</Text></View>}
        <Text style={[styles.name, picked && styles.namePicked]} numberOfLines={1}>{item.otherUserName}</Text>
        <Ionicons
          name={picked ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={picked ? Colors.primary : Colors.border}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={26} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('whosOutside.inviteTitle')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <GlassButton onPress={() => onSend([])} disabled={sending} style={styles.everyone}>
          <Text style={styles.everyoneText}>{t('whosOutside.inviteEveryone')}</Text>
        </GlassButton>
        <Text style={styles.or}>{t('whosOutside.inviteOr')}</Text>

        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={item => String(item.otherUserId)}
            renderItem={renderMatch}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.empty}>{t('whosOutside.inviteNoMatches')}</Text>}
          />
        )}

        {selected.length > 0 && (
          <View style={styles.footer}>
            <GlassButton onPress={() => onSend(selected)} disabled={sending} style={styles.send}>
              {sending
                ? <ActivityIndicator color={Colors.text} />
                : <Text style={styles.sendText}>
                    {t('whosOutside.inviteSelected', { count: selected.length })}
                  </Text>}
            </GlassButton>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  everyone:     { marginHorizontal: 20 },
  everyoneText: { color: Colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  or:           { textAlign: 'center', color: Colors.textSecondary, fontSize: 12, marginVertical: 14 },

  list:        { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  row:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarPlaceholder: { backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  name:       { flex: 1, fontSize: 15, color: Colors.textSecondary },
  namePicked: { color: Colors.text, fontWeight: '700' },
  empty:      { textAlign: 'center', color: Colors.textSecondary, fontSize: 14, marginTop: 24, lineHeight: 20 },

  footer:   { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 },
  send:     {},
  sendText: { color: Colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
