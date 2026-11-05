import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
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
import { ReportUserModal } from '../../components/ReportUserModal';
import { Listing, ListingStatus, formatPrice, marketService } from '../../services/marketService';
import { getApiError } from '../../utils/apiError';
import { formatDistance } from '../../utils/geo';

type Props = NativeStackScreenProps<RootStackParamList, 'ListingDetail'>;

/** The reasons a listing can be reported for: the marketplace's own rules first. */
export const LISTING_REPORT_REASONS = ['Live animal', 'Medicine', 'Not dog-related', 'Scam or spam', 'Other'] as const;

export default function ListingDetailScreen({ navigation, route }: Readonly<Props>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { listingId } = route.params;
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  useFocusEffect(useCallback(() => {
    marketService.get(listingId).then(setListing).catch(e => setError(getApiError(e)));
  }, [listingId]));

  const message = async () => {
    if (!listing) return;
    setBusy(true);
    try {
      const convo = await marketService.openConversation(listing.id);
      navigation.navigate('ListingChat', { conversationId: convo.id });
    } catch (e) {
      Alert.alert(t('common.error'), getApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: ListingStatus) => {
    if (!listing) return;
    setBusy(true);
    try {
      setListing(await marketService.setStatus(listing.id, status));
    } catch (e) {
      Alert.alert(t('common.error'), getApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!listing) return;
    Alert.alert(t('market.detail.deleteTitle'), t('market.detail.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('market.detail.delete'), style: 'destructive',
        onPress: () => marketService.remove(listing.id)
          .then(() => navigation.goBack())
          .catch(e => Alert.alert(t('common.error'), getApiError(e))),
      },
    ]);
  };

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <FloatingBackground />
        <Header onBack={() => navigation.goBack()} />
        <View style={styles.centered}><Text style={styles.muted}>{error}</Text></View>
      </SafeAreaView>
    );
  }
  if (!listing) {
    return (
      <SafeAreaView style={styles.safe}>
        <FloatingBackground />
        <Header onBack={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const photoW = width - 40;
  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />
      <Header
        onBack={() => navigation.goBack()}
        onReport={listing.mine ? undefined : () => setReporting(true)}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {listing.photos.length > 0 ? (
          <View>
            <FlatList
              data={listing.photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={p => String(p.id)}
              onMomentumScrollEnd={e => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / photoW))}
              renderItem={({ item }) => (
                <RemoteImage source={{ uri: item.url }} style={[styles.photo, { width: photoW }]} />
              )}
              style={styles.photos}
            />
            {listing.photos.length > 1 && (
              <View style={styles.dots}>
                {listing.photos.map((p, i) => <View key={p.id} style={[styles.dot, i === photoIndex && styles.dotActive]} />)}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.photo, styles.noPhoto]}><Text style={{ fontSize: 48 }}>🦴</Text></View>
        )}

        <View style={styles.titleRow}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={[styles.price, listing.priceRappen == null && styles.free]}>
            {formatPrice(listing.priceRappen, t('market.free'))}
          </Text>
        </View>
        {listing.status !== 'ACTIVE' && (
          <View style={[styles.badge, listing.status === 'SOLD' && styles.badgeSold]}>
            <Text style={styles.badgeText}>{t(`market.status.${listing.status}`)}</Text>
          </View>
        )}
        <Text style={styles.meta}>
          {t(`market.category.${listing.category}`)}
          {listing.distanceKm >= 0 && !listing.mine ? ` · ${formatDistance(listing.distanceKm, t)}` : ''}
        </Text>
        {listing.description ? <Text style={styles.description}>{listing.description}</Text> : null}

        {!listing.mine && (
          <TouchableOpacity
            style={styles.seller}
            onPress={() => navigation.navigate('UserProfile', { userId: listing.sellerId })}
          >
            {listing.sellerPicture
              ? <RemoteImage source={{ uri: listing.sellerPicture }} style={styles.sellerAvatar} />
              : <View style={[styles.sellerAvatar, styles.noPhoto]}><Text>🐶</Text></View>}
            <Text style={styles.sellerName}>{listing.sellerName}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}

        <GlassCard style={styles.note}>
          <Text style={styles.noteText}>{t('market.detail.pickupNote')}</Text>
        </GlassCard>

        {listing.mine ? (
          <View style={styles.ownerActions}>
            <Text style={styles.muted}>{t('market.detail.asked', { count: listing.conversationCount })}</Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('EditListing', { listingId: listing.id })}>
              <Text style={styles.secondaryText}>{t('market.detail.edit')}</Text>
            </TouchableOpacity>
            {(['ACTIVE', 'RESERVED', 'SOLD'] as const).filter(s => s !== listing.status).map(s => (
              <TouchableOpacity key={s} style={styles.secondaryBtn} onPress={() => setStatus(s)} disabled={busy}>
                <Text style={styles.secondaryText}>{t(`market.detail.mark${s}`)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={remove} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>{t('market.detail.delete')}</Text>
            </TouchableOpacity>
          </View>
        ) : listing.status !== 'SOLD' && (
          <TouchableOpacity style={styles.primaryBtn} onPress={message} disabled={busy} testID="listing-message">
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryText}>
                  {t(listing.myConversationId ? 'market.detail.openChat' : 'market.detail.message')}
                </Text>}
          </TouchableOpacity>
        )}
      </ScrollView>

      <ReportUserModal
        visible={reporting}
        name={listing.title}
        reasons={LISTING_REPORT_REASONS}
        onClose={() => setReporting(false)}
        onSubmit={async (reason, details) => {
          await marketService.report(listing.id, reason, details);
          setReporting(false);
          Alert.alert(t('market.report.doneTitle'), t('market.report.doneBody'));
          navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
}

function Header({ onBack, onReport }: Readonly<{ onBack: () => void; onReport?: () => void }>) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="chevron-back" size={26} color={Colors.text} />
      </TouchableOpacity>
      {onReport ? (
        <TouchableOpacity onPress={onReport} hitSlop={12} testID="listing-report">
          <Ionicons name="flag-outline" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      ) : <View style={{ width: 22 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.background },
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  scroll:   { paddingHorizontal: 20, paddingBottom: 40 },
  muted:    { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },

  photos:  { borderRadius: 16 },
  photo:   { height: 280, borderRadius: 16, backgroundColor: Colors.glass.inputBg },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.glass.inputBg },
  dots:    { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 16 },
  title:    { flex: 1, fontSize: 22, fontWeight: '800', color: Colors.text },
  price:    { fontSize: 20, fontWeight: '800', color: Colors.primary },
  free:     { color: Colors.primary },
  badge:    { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(224,160,48,0.18)' },
  badgeSold: { backgroundColor: 'rgba(229,62,62,0.15)' },
  badgeText: { fontSize: 12, fontWeight: '700', color: Colors.text },
  meta:     { fontSize: 14, color: Colors.textSecondary, marginTop: 6 },
  description: { fontSize: 15, color: Colors.text, lineHeight: 22, marginTop: 12 },

  seller:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, paddingVertical: 8 },
  sellerAvatar: { width: 40, height: 40, borderRadius: 20 },
  sellerName:   { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },

  note:     { marginTop: 14 },
  noteText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  primaryBtn:  { marginTop: 20, backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ownerActions: { marginTop: 18, gap: 10 },
  secondaryBtn: { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  secondaryText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
  deleteBtn:  { alignItems: 'center', paddingVertical: 10 },
  deleteText: { color: Colors.error, fontSize: 15, fontWeight: '600' },
});
