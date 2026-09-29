import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { sosService, LostDogAlert } from '../../services/sosService';
import { translateBreed } from '../../i18n/translateBreed';
import { openInMaps } from '../../utils/placeAddress';
import { getApiError } from '../../utils/apiError';

type Props = NativeStackScreenProps<RootStackParamList, 'SosDetail'>;

/** One lost-dog alert: the photos first, since recognising the dog is the whole point. */
export default function SosDetailScreen({ navigation, route }: Readonly<Props>) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const { alertId } = route.params;
  const [alert, setAlert] = useState<LostDogAlert | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    sosService.get(alertId).then(setAlert).catch(e => setError(getApiError(e)));
  }, [alertId]));

  const close = (found: boolean) => {
    Alert.alert(
      t(found ? 'sos.detail.foundConfirmTitle' : 'sos.detail.closeConfirmTitle'),
      t(found ? 'sos.detail.foundConfirmBody' : 'sos.detail.closeConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t(found ? 'sos.detail.found' : 'sos.detail.close'),
          onPress: async () => {
            setBusy(true);
            try { setAlert(await sosService.close(alertId, found)); }
            catch (e) { Alert.alert(t('common.error'), getApiError(e)); }
            finally { setBusy(false); }
          },
        },
      ],
    );
  };

  const message = async () => {
    if (!alert) return;
    setBusy(true);
    try {
      const matchId = await sosService.contactOwner(alertId);
      navigation.navigate('ChatDetail', {
        matchId, otherUserId: alert.ownerId, name: alert.ownerName, profilePicture: alert.ownerProfilePicture,
      });
    } catch (e) {
      Alert.alert(t('common.error'), getApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="chevron-back" size={26} color={Colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {alert ? t('sos.detail.title', { name: alert.dog.name }) : ''}
      </Text>
      <View style={{ width: 26 }} />
    </View>
  );

  if (!alert) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FloatingBackground />
        {header}
        <View style={styles.centered}>
          {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator size="large" color={Colors.primary} />}
        </View>
      </SafeAreaView>
    );
  }

  const photoWidth = width - 32;
  const photos = alert.dog.photos.length > 0
    ? alert.dog.photos.map(p => p.url)
    : alert.dog.profilePicture ? [alert.dog.profilePicture] : [];
  const seen = new Date(alert.createdAt);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FloatingBackground />
      {header}
      <ScrollView contentContainerStyle={styles.scroll}>
        {!alert.open && (
          <View style={[styles.statusBanner, alert.found && styles.statusBannerFound]}>
            <Text style={styles.statusText}>
              {alert.found ? t('sos.detail.isHome', { name: alert.dog.name }) : t('sos.detail.closed')}
            </Text>
          </View>
        )}

        {photos.length > 0 && (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.photos}>
            {photos.map(uri => (
              <RemoteImage key={uri} source={{ uri }} style={[styles.photo, { width: photoWidth, height: photoWidth * 1.1 }]} />
            ))}
          </ScrollView>
        )}

        <GlassCard style={styles.card}>
          <Text style={styles.dogName}>{alert.dog.name}</Text>
          {alert.dog.breed ? <Text style={styles.breed}>{translateBreed(alert.dog.breed, i18n.language)}</Text> : null}

          <TouchableOpacity
            style={styles.row}
            onPress={() => openInMaps({
              parkName: alert.placeName ?? alert.dog.name,
              address: alert.placeName,
              latitude: alert.latitude,
              longitude: alert.longitude,
            })}
          >
            <Ionicons name="location" size={17} color={Colors.error} />
            <Text style={[styles.rowText, styles.link]}>
              {t('sos.detail.lastSeen', { place: alert.placeName ?? t('sos.detail.onTheMap') })}
              {alert.distanceKm != null ? ` · ${t('sos.detail.kmAway', { km: alert.distanceKm })}` : ''}
            </Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <Ionicons name="time-outline" size={17} color={Colors.textSecondary} />
            <Text style={styles.rowText}>
              {seen.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })}
              {', '}
              {seen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          {alert.note ? <Text style={styles.note}>{alert.note}</Text> : null}

          <View style={styles.ownerRow}>
            {alert.ownerProfilePicture
              ? <RemoteImage source={{ uri: alert.ownerProfilePicture }} style={styles.ownerAvatar} />
              : <View style={[styles.ownerAvatar, styles.ownerAvatarEmpty]}><Text>🐶</Text></View>}
            <Text style={styles.ownerText}>{t('sos.detail.owner', { name: alert.ownerName })}</Text>
          </View>
        </GlassCard>

        {alert.open && !alert.mine && (
          <TouchableOpacity style={[styles.primary, busy && styles.disabled]} onPress={message} disabled={busy}>
            <Ionicons name="chatbubble-ellipses-outline" size={19} color="#fff" />
            <Text style={styles.primaryText}>{t('sos.detail.message', { name: alert.ownerName })}</Text>
          </TouchableOpacity>
        )}

        {alert.open && alert.mine && (
          <>
            <TouchableOpacity style={[styles.primary, styles.found, busy && styles.disabled]} onPress={() => close(true)} disabled={busy}>
              <Text style={styles.primaryText}>{t('sos.detail.found')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => close(false)} disabled={busy}>
              <Text style={styles.secondaryText}>{t('sos.detail.close')}</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  error: { color: Colors.error, textAlign: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: Colors.error, marginHorizontal: 8 },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  statusBanner: {
    backgroundColor: Colors.glass.inputBg, borderRadius: 14, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.glass.inputBorder,
  },
  statusBannerFound: { backgroundColor: 'rgba(46,158,107,0.14)', borderColor: Colors.primary },
  statusText: { fontSize: 15, fontWeight: '700', color: Colors.text, textAlign: 'center' },

  photos: { marginBottom: 14, borderRadius: 22 },
  photo:  { borderRadius: 22 },

  card:    { marginBottom: 14 },
  dogName: { fontSize: 26, fontWeight: '800', color: Colors.text },
  breed:   { fontSize: 15, color: Colors.textSecondary, marginTop: 2, marginBottom: 6 },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  rowText: { flex: 1, fontSize: 15, color: Colors.text },
  link:    { fontWeight: '700' },
  note:    { marginTop: 12, fontSize: 15, color: Colors.text, lineHeight: 21 },
  ownerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.glass.divider,
  },
  ownerAvatar:      { width: 36, height: 36, borderRadius: 18 },
  ownerAvatarEmpty: { backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  ownerText:        { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  primary: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.error, borderRadius: 18, paddingVertical: 15, marginBottom: 10,
  },
  found:       { backgroundColor: Colors.primary },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondary:   { alignItems: 'center', paddingVertical: 12 },
  secondaryText: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  disabled: { opacity: 0.5 },
});
