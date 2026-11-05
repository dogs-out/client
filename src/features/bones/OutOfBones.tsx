import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { BoneStatus } from '../../services/boneService';
import { timeUntil } from './useBones';
import { NativeAd } from 'react-native-google-mobile-ads';
import { ListAdCard } from '../ads/ListAdCard';

type Props = {
  bones: BoneStatus;
  /** Watch an ad for a bone; left out while no ad can be shown. */
  onWatchAd?: () => void;
  watchingAd?: boolean;
  /** Open Premium / bone packs; left out until the store is available. */
  onGetMore?: () => void;
  /** Called once the refill time has passed, to fetch the new count. */
  onRefilled: () => void;
  /** An ad card under the options, if one is loaded (never for Premium). */
  ad?: NativeAd | null;
};

/**
 * Takes the deck's place when the bones run out. Says when they come back first —
 * coming back tomorrow is the point — and only then offers the ways to more.
 */
export function OutOfBones({ bones, onWatchAd, watchingAd, onGetMore, onRefilled, ad }: Readonly<Props>) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const left = timeUntil(bones.refillsAt, now, t);
  useEffect(() => { if (!left) onRefilled(); }, [left, onRefilled]);

  return (
    <View style={styles.wrap} testID="out-of-bones">
      <Text style={styles.emoji}>🦴</Text>
      <Text style={styles.title}>{t('bones.outTitle')}</Text>
      <Text style={styles.sub}>
        {t('bones.outSub', { count: bones.dailyAllowance, time: left || t('bones.soon') })}
      </Text>

      {onWatchAd && bones.adRewardsLeft > 0 && (
        <TouchableOpacity style={styles.primaryBtn} onPress={onWatchAd} disabled={watchingAd} testID="bones-watch-ad">
          {watchingAd
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="play-circle-outline" size={18} color="#fff" />
                <Text style={styles.primaryText}>{t('bones.watchAd')}</Text>
              </>}
        </TouchableOpacity>
      )}
      {/* A real button: solid when it is the only way to more bones, outlined
          under the ad button when both are offered. */}
      {onGetMore && (() => {
        const solo = !(onWatchAd && bones.adRewardsLeft > 0);
        return (
          <TouchableOpacity
            style={solo ? styles.primaryBtn : styles.outlineBtn}
            onPress={onGetMore}
            activeOpacity={0.8}
            testID="bones-get-more"
          >
            <Ionicons name={bones.premium ? 'bag-add-outline' : 'star-outline'} size={18} color={solo ? '#fff' : Colors.primary} />
            <Text style={solo ? styles.primaryText : styles.outlineText}>
              {bones.premium ? t('bones.buyMore') : t('bones.getPremium')}
            </Text>
          </TouchableOpacity>
        );
      })()}
      {ad && <View style={styles.ad}><ListAdCard nativeAd={ad} /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  sub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 21 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24,
    backgroundColor: Colors.primary, borderRadius: 24, paddingHorizontal: 22, paddingVertical: 12, minWidth: 220,
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ad: { alignSelf: 'stretch', marginTop: 28 },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12,
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 24,
    paddingHorizontal: 22, paddingVertical: 11, minWidth: 220,
  },
  outlineText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
});
