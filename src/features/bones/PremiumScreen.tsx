import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PurchasesPackage } from 'react-native-purchases';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { FullLegalLinks } from '../../components/FullLegalLinks';
import { PRODUCTS, productOf, purchases } from '../../services/purchases';
import { BoneStatus, boneService } from '../../services/boneService';
import { userService } from '../../services/userService';

type Props = NativeStackScreenProps<RootStackParamList, 'Premium'>;

/** RevenueCat's webhook usually reaches our server within seconds of the purchase. */
const POLL_TRIES = 10;
const POLL_MS = 1500;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * DogsOut Premium and the bone packs. Prices come from the store, never from
 * here: Apple and Google show the buyer's own currency and taxes.
 */
export default function PremiumScreen({ navigation }: Readonly<Props>) {
  const { t } = useTranslation();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [bones, setBones] = useState<BoneStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Why the store gave us nothing — shown to admins only, so the cause of
  // "not available" can be read off the phone instead of guessed.
  const [storeError, setStoreError] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [showBadge, setShowBadge] = useState(true);

  useEffect(() => {
    purchases.packages().then(setPackages).catch(e => {
      setPackages([]);
      const err = e as { message?: string; code?: string; underlyingErrorMessage?: string };
      setStoreError([err.code, err.message, err.underlyingErrorMessage].filter(Boolean).join(' · '));
    });
    boneService.getStatus().then(setBones).catch(() => {});
    userService.getMe().then(me => {
      setAdmin(me.role === 'ADMIN');
      setShowBadge(me.showPremiumBadge !== false);
    }).catch(() => {});
  }, []);

  const pkg = (product: string) => packages?.find(p => productOf(p) === product);
  const premiumPkg = pkg(PRODUCTS.premium);

  /** Waits for the server to have the purchase, so the screen shows the result. */
  const waitForServer = useCallback(async (before: BoneStatus | null) => {
    for (let i = 0; i < POLL_TRIES; i++) {
      const now = await boneService.getStatus().catch(() => null);
      if (now && (!before || now.premium !== before.premium || now.bonus > before.bonus)) {
        setBones(now);
        return true;
      }
      await sleep(POLL_MS);
    }
    return false;
  }, []);

  const buy = async (p: PurchasesPackage) => {
    setBusy(productOf(p));
    try {
      const bought = await purchases.buy(p);
      if (!bought) return;
      const arrived = await waitForServer(bones);
      Alert.alert(
        t('premium.thanksTitle'),
        arrived ? t(productOf(p) === PRODUCTS.premium ? 'premium.thanksPremium' : 'premium.thanksBones') : t('premium.thanksPending'),
      );
    } catch {
      Alert.alert(t('common.error'), t('premium.failed'));
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    try {
      await purchases.restore();
      await waitForServer(bones);
      Alert.alert(t('premium.restoredTitle'), t('premium.restoredBody'));
    } catch {
      Alert.alert(t('common.error'), t('premium.failed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('premium.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {packages === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <GlassCard style={styles.card}>
            <Text style={styles.premiumTitle}>⭐ {t('premium.name')}</Text>
            {[t('premium.perkBones'), t('premium.perkNoAds')].map(perk => (
              <View key={perk} style={styles.perk}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                <Text style={styles.perkText}>{perk}</Text>
              </View>
            ))}

            {bones?.premium ? (
              <>
                <Text style={styles.active} testID="premium-active">{t('premium.active')}</Text>
                {/* People partly pay to be seen; some would rather not be. */}
                <View style={styles.badgeRow}>
                  <Text style={styles.badgeLabel}>{t('premium.showBadge')}</Text>
                  <Switch
                    value={showBadge}
                    onValueChange={on => {
                      setShowBadge(on);
                      userService.setShowPremiumBadge(on).catch(() => setShowBadge(!on));
                    }}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor="#fff"
                    testID="premium-badge-switch"
                  />
                </View>
              </>
            ) : premiumPkg ? (
              <TouchableOpacity style={styles.buyBtn} onPress={() => buy(premiumPkg)} disabled={busy !== null} testID="buy-premium">
                {busy === PRODUCTS.premium
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buyText}>{t('premium.subscribe', { price: premiumPkg.product.priceString })}</Text>}
              </TouchableOpacity>
            ) : (
              <Text style={styles.unavailable}>{t('premium.unavailable')}</Text>
            )}
            {admin && storeError && !premiumPkg && (
              <Text style={styles.diagnostic} selectable testID="store-error">{storeError}</Text>
            )}
            {/* What Apple and Google require next to a subscription button. */}
            <Text style={styles.fine}>{t('premium.renewal')}</Text>
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>🦴 {t('premium.packsTitle')}</Text>
            <Text style={styles.sectionSub}>{t('premium.packsSub')}</Text>
            {[PRODUCTS.bones10, PRODUCTS.bones30].map(id => {
              const p = pkg(id);
              if (!p) return null;
              return (
                <TouchableOpacity key={id} style={styles.packRow} onPress={() => buy(p)} disabled={busy !== null} testID={`buy-${id}`}>
                  <Text style={styles.packName}>{t(`premium.${id}`)}</Text>
                  {busy === id
                    ? <ActivityIndicator color={Colors.primary} />
                    : <Text style={styles.packPrice}>{p.product.priceString}</Text>}
                </TouchableOpacity>
              );
            })}
            {bones && bones.bonus > 0 && (
              <Text style={styles.sectionSub}>{t('premium.bonusLeft', { count: bones.bonus })}</Text>
            )}
          </GlassCard>

          <TouchableOpacity onPress={restore} disabled={busy !== null} style={styles.restore}>
            {busy === 'restore'
              ? <ActivityIndicator color={Colors.primary} />
              : <Text style={styles.restoreText}>{t('premium.restore')}</Text>}
          </TouchableOpacity>
          <FullLegalLinks />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  scroll:      { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
  card:        { marginBottom: 14 },

  premiumTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  perk:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  perkText:     { fontSize: 15, color: Colors.text },
  buyBtn:       { marginTop: 14, backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 13, alignItems: 'center' },
  buyText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  active:       { marginTop: 14, fontSize: 15, fontWeight: '700', color: Colors.primary, textAlign: 'center' },
  badgeRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 12 },
  badgeLabel:   { flex: 1, fontSize: 14, color: Colors.text },
  unavailable:  { marginTop: 14, fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  diagnostic:   { marginTop: 8, fontSize: 11, color: Colors.error, textAlign: 'center' },
  fine:         { marginTop: 10, fontSize: 12, color: Colors.textSecondary, lineHeight: 17, textAlign: 'center' },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  sectionSub:   { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 6 },
  packRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  packName:  { fontSize: 15, color: Colors.text, fontWeight: '600' },
  packPrice: { fontSize: 15, color: Colors.primary, fontWeight: '700' },

  restore:     { alignItems: 'center', paddingVertical: 12 },
  restoreText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
