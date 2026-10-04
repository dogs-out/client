import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { chatService, MatchSummary } from '../../services/chatService';
import { discoverService } from '../../services/discoverService';

export interface CompanionPick {
  userId: number;
  /** Which of their dogs came along; null when they came on their own. */
  dogId: number | null;
}

interface Props {
  value: CompanionPick[];
  onChange: (next: CompanionPick[]) => void;
}

/** The server keeps at most this many; the picker stops offering more. */
const MAX_COMPANIONS = 5;

/**
 * "Out with Lea and Maylie": pick friends from your matches, then which of their
 * dogs came. Only matches are offered, the same circle that can see the status,
 * and the server checks both the friend and the dog again.
 */
export function CompanionPicker({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const [dogsByUser, setDogsByUser] = useState<Record<number, { id: number; name: string }[]>>({});

  useEffect(() => {
    chatService.getMatches().then(setMatches).catch(() => setMatches([]));
  }, []);

  // Each picked friend's dogs, fetched once per friend.
  useEffect(() => {
    for (const { userId } of value) {
      if (dogsByUser[userId]) continue;
      discoverService.getUserProfile(userId)
        .then(p => setDogsByUser(prev => ({ ...prev, [userId]: p.dogs.map(d => ({ id: d.id, name: d.name })) })))
        .catch(() => setDogsByUser(prev => ({ ...prev, [userId]: [] })));
    }
  }, [value, dogsByUser]);

  const picked = (userId: number) => value.find(v => v.userId === userId);

  const toggleFriend = (userId: number) => {
    if (picked(userId)) onChange(value.filter(v => v.userId !== userId));
    else if (value.length < MAX_COMPANIONS) onChange([...value, { userId, dogId: null }]);
  };

  const setDog = (userId: number, dogId: number | null) =>
    onChange(value.map(v => v.userId === userId ? { ...v, dogId } : v));

  if (matches === null) return <ActivityIndicator color={Colors.primary} />;
  if (matches.length === 0) return <Text style={styles.hint}>{t('whosOutside.companionsNoMatches')}</Text>;

  return (
    <View>
      <View style={styles.chips}>
        {matches.map(m => {
          const on = !!picked(m.otherUserId);
          return (
            <TouchableOpacity
              key={m.matchId}
              style={[styles.friend, on && styles.friendOn]}
              onPress={() => toggleFriend(m.otherUserId)}
              disabled={!on && value.length >= MAX_COMPANIONS}
            >
              {m.otherUserProfilePicture
                ? <RemoteImage source={{ uri: m.otherUserProfilePicture }} style={styles.avatar} />
                : <View style={[styles.avatar, styles.avatarEmpty]}><Text style={{ fontSize: 12 }}>🐶</Text></View>}
              <Text style={[styles.friendName, on && styles.friendNameOn]} numberOfLines={1}>{m.otherUserName}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {value.map(({ userId, dogId }) => {
        const friend = matches.find(m => m.otherUserId === userId);
        const dogs = dogsByUser[userId];
        if (!friend) return null;
        return (
          <View key={userId} style={styles.dogBlock}>
            <Text style={styles.dogQuestion}>{t('whosOutside.companionWhichDog', { name: friend.otherUserName })}</Text>
            {dogs === undefined ? <ActivityIndicator size="small" color={Colors.primary} /> : (
              <View style={styles.chips}>
                <TouchableOpacity style={[styles.dog, dogId === null && styles.dogOn]} onPress={() => setDog(userId, null)}>
                  <Text style={[styles.dogText, dogId === null && styles.dogTextOn]}>{t('whosOutside.companionNoDog')}</Text>
                </TouchableOpacity>
                {dogs.map(d => (
                  <TouchableOpacity key={d.id} style={[styles.dog, dogId === d.id && styles.dogOn]} onPress={() => setDog(userId, d.id)}>
                    <Text style={[styles.dogText, dogId === d.id && styles.dogTextOn]}>🐕 {d.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hint:  { fontSize: 13, color: Colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  friend: {
    flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%',
    paddingVertical: 5, paddingLeft: 5, paddingRight: 12, borderRadius: 18,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.glass.inputBg,
  },
  friendOn:     { borderColor: Colors.primary, backgroundColor: 'rgba(46,158,107,0.12)' },
  avatar:       { width: 26, height: 26, borderRadius: 13 },
  avatarEmpty:  { backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  friendName:   { fontSize: 13, color: Colors.textSecondary, flexShrink: 1 },
  friendNameOn: { color: Colors.primary, fontWeight: '700' },
  dogBlock:    { marginTop: 14 },
  dogQuestion: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  dog: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.glass.inputBg,
  },
  dogOn:     { borderColor: Colors.primary, backgroundColor: 'rgba(46,158,107,0.12)' },
  dogText:   { fontSize: 13, color: Colors.textSecondary },
  dogTextOn: { color: Colors.primary, fontWeight: '700' },
});
