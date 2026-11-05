import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { DogSchool, schoolService } from '../../services/schoolService';
import { formatDistance } from '../../utils/geo';
import { getApiError } from '../../utils/apiError';
import { EventCard } from './EventCard';
import { ReportUserModal } from '../../components/ReportUserModal';

/** What a school page can be reported for. Canonical English, translated as tags. */
export const SCHOOL_REPORT_REASONS = ['Not a real dog school', 'Inappropriate content', 'Scam or spam', 'Other'] as const;

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolDetail'>;

/** Opens the address in the phone's own maps app. */
export function openInMaps(latitude: number, longitude: number, label: string) {
  const q = encodeURIComponent(label);
  const url = Platform.OS === 'ios'
    ? `http://maps.apple.com/?ll=${latitude},${longitude}&q=${q}`
    : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${q})`;
  Linking.openURL(url).catch(() => {});
}

export default function SchoolDetailScreen({ navigation, route }: Readonly<Props>) {
  const { t } = useTranslation();
  const { schoolId } = route.params;
  const [school, setSchool] = useState<DogSchool | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  const removeSchool = () => {
    Alert.alert(t('school.deleteTitle'), t('school.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('school.delete'), style: 'destructive',
        onPress: () => schoolService.deleteMine()
          .then(() => navigation.goBack())
          .catch(e => Alert.alert(t('common.error'), getApiError(e))),
      },
    ]);
  };

  useFocusEffect(useCallback(() => {
    schoolService.get(schoolId).then(setSchool).catch(e => setError(getApiError(e)));
  }, [schoolId]));

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{school?.name ?? ''}</Text>
        {school && !school.mine ? (
          <TouchableOpacity onPress={() => setReporting(true)} hitSlop={12} testID="school-report">
            <Ionicons name="flag-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : <View style={{ width: 26 }} />}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : !school ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.top}>
            {school.logo
              ? <RemoteImage source={{ uri: school.logo }} style={styles.logo} />
              : <View style={[styles.logo, styles.noLogo]}><Text style={{ fontSize: 36 }}>🎓</Text></View>}
            <Text style={styles.name}>{school.name}</Text>
            {school.distanceKm >= 0 && !school.mine && <Text style={styles.meta}>{formatDistance(school.distanceKm, t)}</Text>}
          </View>

          {school.mine && school.status !== 'APPROVED' && (
            <GlassCard style={styles.card}>
              <Text style={[styles.statusTitle, school.status === 'REJECTED' && styles.rejected]}>
                {t(`school.status.${school.status}`)}
              </Text>
              <Text style={styles.text}>{t(`school.statusHint.${school.status}`)}</Text>
              {school.reviewNote && <Text style={[styles.text, styles.note]}>{school.reviewNote}</Text>}
            </GlassCard>
          )}

          <View style={styles.actions}>
            {school.phone && (
              <TouchableOpacity style={styles.action} onPress={() => Linking.openURL(`tel:${school.phone!.replace(/\s/g, '')}`)}>
                <Ionicons name="call-outline" size={20} color={Colors.primary} />
                <Text style={styles.actionText}>{t('school.call')}</Text>
              </TouchableOpacity>
            )}
            {school.website && (
              <TouchableOpacity style={styles.action} onPress={() => WebBrowser.openBrowserAsync(school.website!)}>
                <Ionicons name="globe-outline" size={20} color={Colors.primary} />
                <Text style={styles.actionText}>{t('school.website')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.action} onPress={() => openInMaps(school.latitude, school.longitude, school.name)}>
              <Ionicons name="map-outline" size={20} color={Colors.primary} />
              <Text style={styles.actionText}>{t('school.directions')}</Text>
            </TouchableOpacity>
          </View>

          <GlassCard style={styles.card}>
            <Text style={styles.label}>{t('school.address')}</Text>
            <Text style={styles.text}>{school.address}</Text>
            {school.openingHours && (
              <>
                <Text style={[styles.label, styles.spaced]}>{t('school.openingHours')}</Text>
                <Text style={styles.text}>{school.openingHours}</Text>
              </>
            )}
            {school.description && (
              <>
                <Text style={[styles.label, styles.spaced]}>{t('school.about')}</Text>
                <Text style={styles.text}>{school.description}</Text>
              </>
            )}
          </GlassCard>

          {school.mine && (
            <View style={styles.ownerRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('EditSchool')}>
                <Text style={styles.secondaryText}>{t('school.edit')}</Text>
              </TouchableOpacity>
              {school.status === 'APPROVED' && (
                <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('EditEvent')} testID="add-event">
                  <Text style={styles.primaryText}>{t('school.addEvent')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.section}>{t('school.upcoming')}</Text>
          {school.upcomingEvents.length === 0
            ? <Text style={styles.muted}>{t('school.noEvents')}</Text>
            : school.upcomingEvents.map(e => (
              <EventCard key={e.id} event={e} showSchool={false} onPress={() => navigation.navigate('EventDetail', { eventId: e.id })} />
            ))}

          {school.mine && (
            <TouchableOpacity onPress={removeSchool} style={styles.deleteBtn} testID="school-delete">
              <Text style={styles.deleteText}>{t('school.delete')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {school && (
        <ReportUserModal
          visible={reporting}
          name={school.name}
          reasons={SCHOOL_REPORT_REASONS}
          onClose={() => setReporting(false)}
          onSubmit={async (reason, details) => {
            await schoolService.report(school.id, reason, details);
            setReporting(false);
            Alert.alert(t('school.reportDoneTitle'), t('school.reportDoneBody'));
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.text, marginHorizontal: 8 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  error:  { textAlign: 'center', color: Colors.textSecondary, marginTop: 40, paddingHorizontal: 30 },
  top:    { alignItems: 'center', marginBottom: 14 },
  logo:   { width: 96, height: 96, borderRadius: 22 },
  noLogo: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46,158,107,0.12)' },
  name:   { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 10, textAlign: 'center' },
  meta:   { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  card:   { marginBottom: 14 },
  statusTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  rejected: { color: Colors.error },
  note:   { marginTop: 6, fontStyle: 'italic' },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 14 },
  action: { alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: Colors.glass.inputBg, borderWidth: 1, borderColor: Colors.border, minWidth: 84 },
  actionText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  label:  { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  spaced: { marginTop: 12 },
  text:   { fontSize: 15, color: Colors.text, lineHeight: 21, marginTop: 2 },
  ownerRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  primaryBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 22, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 22, paddingVertical: 11, alignItems: 'center' },
  secondaryText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
  section: { fontSize: 17, fontWeight: '800', color: Colors.text, marginTop: 14, marginBottom: 10 },
  muted:  { fontSize: 14, color: Colors.textSecondary },
  deleteBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 20 },
  deleteText: { color: Colors.error, fontSize: 15, fontWeight: '600' },
});
