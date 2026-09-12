import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { GlassCard } from '../../components/GlassCard';
import { Colors } from '../../constants/colors';
import { RootStackParamList } from '../../types/navigation';
import { userService, DEFAULT_STATUS, STATUS_IS_OUT, WalkingFriend, WalkStatus } from '../../services/userService';
import { InvitePicker } from './InvitePicker';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Who among your matches is out right now.
 *
 * <p>Matches only, because the row can carry roughly where somebody is standing.
 * That is the same reason the invite is a button rather than something that fires
 * whenever a status changes, and the reason a point is optional — all three are
 * about not handing out more than the person meant to give.
 */
export function WhosOutsideView() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();

  const [friends, setFriends] = useState<WalkingFriend[]>([]);
  const [myStatus, setMyStatus] = useState<WalkStatus>(DEFAULT_STATUS);
  const [picking, setPicking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [onMap, setOnMap] = useState<WalkingFriend | null>(null);

  const load = useCallback(() => {
    Promise.all([userService.getWalkingFriends(), userService.getMe()])
      .then(([walking, me]) => { setFriends(walking); setMyStatus(me.walkStatus ?? DEFAULT_STATUS); })
      .catch(() => { /* the empty state says enough */ })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const invite = async (userIds: number[]) => {
    setInviting(true);
    try {
      await userService.inviteMatchesToWalk(userIds);
      setPicking(false);
      Alert.alert(
        t('whosOutside.inviteSentTitle'),
        userIds.length > 0
          ? t('whosOutside.inviteSentSome', { count: userIds.length })
          : t('whosOutside.inviteSentBody'));
    } catch {
      Alert.alert(t('common.error'), t('whosOutside.inviteFailed'));
    } finally {
      setInviting(false);
    }
  };

  const renderFriend = ({ item }: { item: WalkingFriend }) => {
    const dogs = item.dogNames.join(' & ');
    // No point shared means no map to open, so the row stays flat rather than
    // offering a tap that goes nowhere.
    const hasPoint = item.latitude !== null && item.longitude !== null;
    // "at the park" and "sitting Luna" are different sentences, not the same one
    // with a word swapped, so each status gets its own phrasing.
    const line = dogs
      ? t(`whosOutside.line.${item.status}`, { name: item.name, dog: dogs })
      : t('whosOutside.isOut', { name: item.name });
    return (
      <GlassCard style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          activeOpacity={hasPoint ? 0.7 : 1}
          disabled={!hasPoint}
          onPress={() => setOnMap(item)}
        >
          {item.profilePicture
            ? <RemoteImage source={{ uri: item.profilePicture }} style={styles.avatar} />
            : <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 22 }}>🐶</Text></View>
          }
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={2}>{line}</Text>
            {item.placeName && (
              <Text style={styles.rowPlace} numberOfLines={1}>
                <Ionicons name="location-outline" size={12} color={Colors.primary} />
                {' '}{item.placeName}
              </Text>
            )}
            <Text style={styles.rowSub}>
              {item.distanceKm >= 0
                ? <><Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                    {' '}{t('matching.discover.distanceAway', { km: item.distanceKm })}</>
                : t('whosOutside.noPoint')}
            </Text>
          </View>
          {hasPoint && <Ionicons name="map-outline" size={20} color={Colors.primary} />}
        </TouchableOpacity>
      </GlassCard>
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <>
      <View style={styles.statusBar}>
        <TouchableOpacity style={styles.statusBtn} onPress={() => navigation.navigate('SetStatus')}>
          <Ionicons name="walk-outline" size={16} color={Colors.primary} />
          <Text style={styles.statusBtnText}>{t(`whosOutside.status.${myStatus}`)}</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
        </TouchableOpacity>

        {STATUS_IS_OUT[myStatus] && (
          <TouchableOpacity style={styles.inviteBtn} onPress={() => setPicking(true)} disabled={inviting}>
            <Text style={styles.inviteText}>{t('whosOutside.invite')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={friends}
        keyExtractor={item => String(item.userId)}
        renderItem={renderFriend}
        style={styles.flex}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyEmoji}>🚶</Text>
            <Text style={styles.emptyText}>{t('whosOutside.empty')}</Text>
          </View>
        }
      />

      <Modal visible={onMap !== null} animationType="slide" onRequestClose={() => setOnMap(null)}>
        {onMap?.latitude != null && onMap.longitude != null && (
          <View style={{ flex: 1 }}>
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: onMap.latitude,
                longitude: onMap.longitude,
                latitudeDelta: 0.012,
                longitudeDelta: 0.012,
              }}
            >
              <Marker
                coordinate={{ latitude: onMap.latitude, longitude: onMap.longitude }}
                title={onMap.placeName ?? onMap.name}
                description={onMap.dogNames.join(' & ')}
              />
            </MapView>
            <View style={styles.mapBar}>
              <TouchableOpacity onPress={() => setOnMap(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={26} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.mapTitle} numberOfLines={1}>
                {onMap.placeName ?? (onMap.dogNames.length > 0
                  ? t(`whosOutside.line.${onMap.status}`, { name: onMap.name, dog: onMap.dogNames.join(' & ') })
                  : t('whosOutside.isOut', { name: onMap.name }))}
              </Text>
              <View style={{ width: 26 }} />
            </View>
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex:     { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },

  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 8 },
  statusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: 'rgba(46,158,107,0.08)',
  },
  statusBtnText: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.text },
  inviteBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, minWidth: 84, alignItems: 'center',
  },
  inviteText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  list: { paddingHorizontal: 20, paddingBottom: 120, flexGrow: 1 },
  card: { marginTop: 10 },
  row:  { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  rowBody:  { flex: 1, marginRight: 8 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  rowSub:   { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  rowPlace: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  rowPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, marginTop: 10 },

  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyText:  { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  mapBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    backgroundColor: 'rgba(238,251,243,0.92)',
  },
  mapTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: Colors.text },
});
