import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { playdateService, Playdate } from '../../services/playdateService';
import { chatSocket } from '../../services/socket';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { formatPlaydateTime } from './PlaydatesScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'PlaydateDetail'>;

export default function PlaydateDetailScreen({ navigation, route }: Readonly<Props>) {
  const { t, i18n } = useTranslation();
  const { playdateId } = route.params;
  const [playdate, setPlaydate] = useState<Playdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    playdateService.getPlaydate(playdateId)
      .then(p => { setPlaydate(p); setError(null); })
      .catch(() => setError(t('playdates.loadError')));
  }, [playdateId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
      const unsubscribe = chatSocket.subscribe(event => {
        if (event.type === 'PLAYDATE_UPDATED' && event.playdateId === playdateId) load();
      });
      return unsubscribe;
    }, [load, playdateId])
  );

  const act = (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    action()
      .then(() => load())
      .catch(err => {
        const status = err instanceof AxiosError ? err.response?.status : null;
        const message = status === 409
          ? t('playdates.errors.full')
          : (err instanceof AxiosError ? err.response?.data?.message : null) ?? t('common.error');
        Alert.alert(t('common.error'), message);
        load();
      })
      .finally(() => setBusy(false));
  };

  const confirmCancel = () => {
    Alert.alert(
      t('playdates.detail.cancel'),
      t('playdates.detail.cancelConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('playdates.detail.cancel'), style: 'destructive', onPress: () => act(() => playdateService.cancelPlaydate(playdateId)) },
      ]
    );
  };

  const openChat = () => {
    if (!playdate) return;
    navigation.navigate('PlaydateChat', { playdateId, title: playdate.title ?? playdate.parkName });
  };

  if (!playdate) {
    return (
      <SafeAreaView style={styles.safe}>
        <FloatingBackground />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={26} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.centered}>
          {error
            ? <><Text style={styles.emptyEmoji}>🐾</Text><Text style={styles.emptyText}>{error}</Text></>
            : <ActivityIndicator size="large" color={Colors.primary} />}
        </View>
      </SafeAreaView>
    );
  }

  const cancelled = playdate.status === 'CANCELLED';
  const isFull = playdate.maxParticipants != null && playdate.joinedCount >= playdate.maxParticipants;
  const joinedParticipants = (playdate.participants ?? []).filter(p => p.status === 'JOINED' || p.status === 'HOST');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{playdate.title ?? playdate.parkName}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {cancelled && (
          <View style={styles.cancelledBanner}>
            <Ionicons name="close-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.cancelledText}>{t('playdates.detail.cancelled')}</Text>
          </View>
        )}

        {/* Map preview */}
        <GlassCard padding={0} plain style={styles.mapCard}>
          <MapView
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{
              latitude: playdate.latitude, longitude: playdate.longitude,
              latitudeDelta: 0.01, longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
          >
            <Marker
              coordinate={{ latitude: playdate.latitude, longitude: playdate.longitude }}
              pinColor={Colors.primary}
            />
          </MapView>
          <View style={styles.mapInfo}>
            <Text style={styles.parkName}>{playdate.parkName}</Text>
            {playdate.address && <Text style={styles.address}>{playdate.address}</Text>}
          </View>
        </GlassCard>

        {/* Info */}
        <GlassCard style={styles.card}>
          <Text style={styles.timeText}>
            <Ionicons name="time-outline" size={15} color={Colors.primary} /> {formatPlaydateTime(playdate.startsAt, i18n.language)}
          </Text>
          {playdate.description && <Text style={styles.description}>{playdate.description}</Text>}

          <TouchableOpacity
            style={styles.hostRow}
            onPress={() => navigation.navigate('UserProfile', { userId: playdate.hostId })}
          >
            {playdate.hostProfilePicture
              ? <RemoteImage source={{ uri: playdate.hostProfilePicture }} style={styles.hostAvatar} />
              : <View style={[styles.hostAvatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 16 }}>🐶</Text></View>
            }
            <Text style={styles.hostText}>{t('playdates.detail.hostedBy', { name: playdate.hostName })}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </GlassCard>

        {/* Attendees */}
        <GlassCard style={styles.card}>
          <Text style={styles.sectionLabel}>
            {t('playdates.detail.attendees')} ({playdate.joinedCount}{playdate.maxParticipants ? `/${playdate.maxParticipants}` : ''})
          </Text>
          <View style={styles.attendeeWrap}>
            {joinedParticipants.map(p => (
              <TouchableOpacity
                key={p.userId}
                style={styles.attendee}
                onPress={() => navigation.navigate('UserProfile', { userId: p.userId })}
              >
                {p.profilePicture
                  ? <RemoteImage source={{ uri: p.profilePicture }} style={styles.attendeeAvatar} />
                  : <View style={[styles.attendeeAvatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 18 }}>🐶</Text></View>
                }
                <Text style={styles.attendeeName} numberOfLines={1}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* Actions */}
        {!cancelled && (
          <GlassCard style={styles.card}>
            {busy ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                {playdate.myStatus === 'NONE' && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, isFull && styles.btnDisabled]}
                    disabled={isFull}
                    onPress={() => act(() => playdateService.join(playdateId))}
                  >
                    <Text style={styles.primaryBtnText}>
                      {isFull ? t('playdates.detail.full') : t('playdates.detail.join')}
                    </Text>
                  </TouchableOpacity>
                )}

                {playdate.myStatus === 'INVITED' && (
                  <>
                    <TouchableOpacity
                      style={[styles.primaryBtn, isFull && styles.btnDisabled]}
                      disabled={isFull}
                      onPress={() => act(() => playdateService.join(playdateId))}
                    >
                      <Text style={styles.primaryBtnText}>
                        {isFull ? t('playdates.detail.full') : t('playdates.detail.accept')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={() => act(() => playdateService.leave(playdateId))}
                    >
                      <Text style={styles.secondaryBtnText}>{t('playdates.detail.decline')}</Text>
                    </TouchableOpacity>
                  </>
                )}

                {(playdate.myStatus === 'JOINED' || playdate.myStatus === 'HOST') && (
                  <TouchableOpacity style={styles.primaryBtn} onPress={openChat}>
                    <Ionicons name="chatbubbles-outline" size={17} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>{t('playdates.detail.openChat')}</Text>
                  </TouchableOpacity>
                )}

                {playdate.myStatus === 'JOINED' && (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => act(() => playdateService.leave(playdateId))}
                  >
                    <Text style={styles.secondaryBtnText}>{t('playdates.detail.leave')}</Text>
                  </TouchableOpacity>
                )}

                {playdate.myStatus === 'HOST' && (
                  <>
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={() => navigation.navigate('CreatePlaydate', { playdateId })}
                    >
                      <Ionicons name="create-outline" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.secondaryBtnText, { color: Colors.primary }]}>{t('playdates.detail.edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={confirmCancel}>
                      <Ionicons name="trash-outline" size={16} color={Colors.error} style={{ marginRight: 6 }} />
                      <Text style={styles.secondaryBtnText}>{t('playdates.detail.cancel')}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </GlassCard>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, flexShrink: 1 },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  cancelledBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.error, borderRadius: 14, paddingVertical: 10, marginBottom: 12,
  },
  cancelledText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  mapCard: { overflow: 'hidden', marginBottom: 16 },
  map:     { width: '100%', height: 160 },
  mapInfo: { padding: 14 },
  parkName:{ fontSize: 16, fontWeight: '700', color: Colors.text },
  address: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  card: { marginBottom: 16 },

  timeText:    { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  description: { fontSize: 14, color: Colors.text, lineHeight: 20, marginBottom: 12 },

  hostRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  hostAvatar: { width: 34, height: 34, borderRadius: 17 },
  avatarPlaceholder: { backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  hostText:   { flex: 1, fontSize: 14, color: Colors.textSecondary },

  sectionLabel: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  attendeeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  attendee:     { alignItems: 'center', width: 60 },
  attendeeAvatar: { width: 48, height: 48, borderRadius: 24, marginBottom: 4 },
  attendeeName: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 48, borderRadius: 15, backgroundColor: Colors.primary, marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled:    { opacity: 0.5 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 44, borderRadius: 15, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 10,
  },
  secondaryBtnText: { color: Colors.error, fontSize: 14, fontWeight: '600' },

  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText:  { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
});
