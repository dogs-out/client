import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  NativeAd, NativeAdView, NativeAsset, NativeAssetType, NativeMediaView,
} from 'react-native-google-mobile-ads';
import { Colors } from '../../constants/colors';

interface Props {
  nativeAd: NativeAd;
  width: number;
  height: number;
}

/**
 * A sponsored card in the Discover deck, the same size as a profile card.
 *
 * <p>Swiped away like any other card, in either direction; tapping it is what
 * opens the ad. AdMob only counts a genuine tap on the ad's own views as a click,
 * so a swipe cannot open it — and a card built to be swiped right on and then
 * open would be the accidental-click pattern AdMob bans accounts for.
 *
 * <p>The "Sponsored" label is not optional: native ads must be marked as ads.
 */
export function DeckAdCard({ nativeAd, width, height }: Readonly<Props>) {
  const { t } = useTranslation();
  // Sized by the creative's own shape and centred on a dark band, so a square
  // image does not leave a white strip beside it on a card that is taller than wide.
  const aspect = nativeAd.mediaContent?.aspectRatio || 16 / 9;
  const mediaHeight = Math.round(Math.min(height * 0.58, width / aspect));
  const mediaWidth = Math.round(Math.min(width, mediaHeight * aspect));

  return (
    <NativeAdView nativeAd={nativeAd} style={[styles.card, { width, height }]}>
      <View style={[styles.mediaBand, { height: mediaHeight }]}>
        <NativeMediaView style={{ width: mediaWidth, height: mediaHeight }} resizeMode="cover" />
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{t('ads.sponsored')}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.headRow}>
          {nativeAd.icon && (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
            </NativeAsset>
          )}
          <View style={styles.headText}>
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={styles.headline} numberOfLines={2}>{nativeAd.headline}</Text>
            </NativeAsset>
            {nativeAd.advertiser ? (
              <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                <Text style={styles.advertiser} numberOfLines={1}>{nativeAd.advertiser}</Text>
              </NativeAsset>
            ) : null}
          </View>
        </View>

        {nativeAd.body ? (
          <NativeAsset assetType={NativeAssetType.BODY}>
            <Text style={styles.body} numberOfLines={3}>{nativeAd.body}</Text>
          </NativeAsset>
        ) : null}

        {nativeAd.callToAction ? (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <Text style={styles.cta}>{nativeAd.callToAction}</Text>
          </NativeAsset>
        ) : null}

        <Text style={styles.hint}>{t('ads.swipeHint')}</Text>
      </View>
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden' },
  mediaBand: { width: '100%', backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(13,40,24,0.72)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  info:     { flex: 1, padding: 16, gap: 10 },
  headRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon:     { width: 44, height: 44, borderRadius: 10 },
  headText: { flex: 1 },
  headline:   { fontSize: 18, fontWeight: '800', color: Colors.text },
  advertiser: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  body:     { fontSize: 14, color: Colors.text, lineHeight: 19 },
  cta: {
    alignSelf: 'stretch', textAlign: 'center', overflow: 'hidden',
    backgroundColor: Colors.primary, color: '#fff', fontSize: 15, fontWeight: '800',
    borderRadius: 14, paddingVertical: 11,
  },
  hint: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
});
