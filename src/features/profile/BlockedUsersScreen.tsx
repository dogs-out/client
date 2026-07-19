import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { moderationService, BlockedUser } from '../../services/moderationService';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';

type Props = NativeStackScreenProps<RootStackParamList, 'BlockedUsers'>;

export default function BlockedUsersScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    moderationService.getBlockedUsers()
      .then(setBlocked)
      .catch(() => Alert.alert(t('common.error'), t('profile.blockedUsers.loadError')))
      .finally(() => setLoaded(true));
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unblock = (user: BlockedUser) => {
    Alert.alert(
      t('profile.blockedUsers.unblockConfirmTitle', { name: user.name }),
      t('profile.blockedUsers.unblockConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.blockedUsers.unblock'),
          onPress: () => moderationService.unblockUser(user.userId)
            .then(() => setBlocked(prev => prev.filter(b => b.userId !== user.userId)))
            .catch(() => Alert.alert(t('common.error'), t('profile.blockedUsers.unblockError'))),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.blockedUsers.headerTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {!loaded ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : blocked.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🕊️</Text>
          <Text style={styles.emptyTitle}>{t('profile.blockedUsers.emptyTitle')}</Text>
          <Text style={styles.emptySub}>{t('profile.blockedUsers.emptySub')}</Text>
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={b => String(b.userId)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GlassCard padding={0} style={styles.card}>
              <View style={styles.row}>
                {item.profilePicture
                  ? <Image source={{ uri: item.profilePicture }} style={styles.avatar} />
                  : <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 20 }}>🐶</Text></View>
                }
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <TouchableOpacity style={styles.unblockBtn} onPress={() => unblock(item)}>
                  <Text style={styles.unblockText}>{t('profile.blockedUsers.unblock')}</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 },
  card: { marginBottom: 12 },
  row:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },

  avatar:            { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  name:              { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },

  unblockBtn:  { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  unblockText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },

  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  emptySub:   { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
