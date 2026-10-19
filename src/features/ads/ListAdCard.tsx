import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  NativeAd, NativeAdView, NativeAsset, NativeAssetType, NativeMediaView,
} from 'react-native-google-mobile-ads';
import { Colors } from '../../constants/colors';

/**
 * The one ad in a list — Chats, Playdates, Walks.
 *
 * <p>Built not to pass for an entry of the list: AdMob's native ad policy forbids
 * ads that look like the content around them, and here that content is people and
 * their plans. So it has its own tinted background instead of the glass cards, a
 * "Sponsored" label where a name would be, no avatar, and a button rather than a
 * message preview.
 */
export function ListAdCard({ nativeAd }: Readonly<{ nativeAd: NativeAd }>) {
  const { t } = useTranslation();
  const aspect = nativeAd.mediaContent?.aspectRatio || 16 / 9;

  return (
    <NativeAdView nativeAd={nativeAd} style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.badge}>{t('ads.sponsored')}</Text>
        {nativeAd.advertiser ? (
          <NativeAsset assetType={NativeAssetType.ADVERTISER}>
            <Text style={styles.advertiser} numberOfLines={1}>{nativeAd.advertiser}</Text>
          </NativeAsset>
        ) : null}
      </View>

      <View style={styles.body}>
        {nativeAd.icon && (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        )}
        <View style={styles.text}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.headline} numberOfLines={2}>{nativeAd.headline}</Text>
          </NativeAsset>
          {nativeAd.body ? (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text style={styles.bodyText} numberOfLines={2}>{nativeAd.body}</Text>
            </NativeAsset>
          ) : null}
        </View>
      </View>

      {/* The media view is required whenever the ad brings media; kept short so
          the card stays a list row and not a second Discover deck. */}
      <NativeMediaView style={[styles.media, { aspectRatio: Math.max(aspect, 1.6) }]} resizeMode="cover" />

      {nativeAd.callToAction ? (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <Text style={styles.cta}>{nativeAd.callToAction}</Text>
        </NativeAsset>
      ) : null}
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10, borderRadius: 18, padding: 12, gap: 10,
    backgroundColor: 'rgba(13,40,24,0.06)', borderWidth: 1, borderColor: 'rgba(13,40,24,0.12)',
  },
  headRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase',
    color: '#fff', backgroundColor: 'rgba(13,40,24,0.72)', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden',
  },
  advertiser: { flex: 1, fontSize: 12, color: Colors.textSecondary },
  body:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon:       { width: 40, height: 40, borderRadius: 9 },
  text:       { flex: 1 },
  headline:   { fontSize: 15, fontWeight: '800', color: Colors.text },
  bodyText:   { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },
  media:      { width: '100%', maxHeight: 150, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111' },
  cta: {
    textAlign: 'center', overflow: 'hidden',
    backgroundColor: Colors.primary, color: '#fff', fontSize: 14, fontWeight: '800',
    borderRadius: 12, paddingVertical: 9,
  },
});
