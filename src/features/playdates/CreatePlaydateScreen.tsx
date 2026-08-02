import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { playdateService, PlaceResult, PlaydateVisibility } from '../../services/playdateService';
import { chatService, MatchSummary } from '../../services/chatService';
import { getApiError } from '../../utils/apiError';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { CustomSlider } from '../../components/CustomSlider';

type Props = NativeStackScreenProps<RootStackParamList, 'CreatePlaydate'>;

const VISIBILITY_OPTIONS: PlaydateVisibility[] = ['PUBLIC', 'MATCHES_ONLY', 'INVITE_ONLY'];

const VISIBILITY_LABEL_KEYS: Record<PlaydateVisibility, { label: string; hint: string }> = {
  PUBLIC:       { label: 'playdates.visibility.public',      hint: 'playdates.visibility.publicHint' },
  MATCHES_ONLY: { label: 'playdates.visibility.matchesOnly', hint: 'playdates.visibility.matchesOnlyHint' },
  INVITE_ONLY:  { label: 'playdates.visibility.inviteOnly',  hint: 'playdates.visibility.inviteOnlyHint' },
};

function defaultStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(15, 0, 0, 0);
  return d;
}

export default function CreatePlaydateScreen({ navigation, route }: Readonly<Props>) {
  const { t, i18n } = useTranslation();
  const playdateId = route.params?.playdateId;

  const [park, setPark] = useState<PlaceResult | null>(null);
  const [startsAt, setStartsAt] = useState<Date>(defaultStart());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hasLimit, setHasLimit] = useState(false);
  const [limit, setLimit] = useState(6);
  const [visibility, setVisibility] = useState<PlaydateVisibility>('PUBLIC');
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [invitees, setInvitees] = useState<number[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!playdateId);
  const [error, setError] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // The participant slider is a horizontal drag, same motion as swipe-to-go-back,
  // and the system edge recognizer wins that race at touch-down. Off for the whole
  // screen (it has its own back button) — see ProfileForm and DiscoverFiltersScreen.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
    return () => navigation.setOptions({ gestureEnabled: true });
  }, [navigation]);

  // ParkPicker returns its selection by navigating back with merged params
  useEffect(() => {
    if (route.params?.pickedPark) setPark(route.params.pickedPark);
  }, [route.params?.pickedPark]);

  useEffect(() => {
    chatService.getMatches().then(setMatches).catch(() => {});
  }, []);

  useEffect(() => {
    if (!playdateId) return;
    playdateService.getPlaydate(playdateId).then(p => {
      setPark({ name: p.parkName, address: p.address, latitude: p.latitude, longitude: p.longitude });
      setStartsAt(new Date(p.startsAt));
      setTitle(p.title ?? '');
      setDescription(p.description ?? '');
      setHasLimit(p.maxParticipants != null);
      if (p.maxParticipants != null) setLimit(p.maxParticipants);
      setVisibility(p.visibility);
    }).catch(() => setError(t('playdates.loadError'))).finally(() => setFetching(false));
  }, [playdateId, t]);

  const toggleInvitee = (userId: number) => {
    setInvitees(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const setDatePart = (d: Date) => {
    setStartsAt(prev => {
      const next = new Date(prev);
      next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
      return next;
    });
  };

  const setTimePart = (d: Date) => {
    setStartsAt(prev => {
      const next = new Date(prev);
      next.setHours(d.getHours(), d.getMinutes(), 0, 0);
      return next;
    });
  };

  const handleSave = async () => {
    if (!park) { setError(t('playdates.create.parkRequired')); return; }
    if (startsAt.getTime() <= Date.now()) { setError(t('playdates.errors.past')); return; }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        parkName: park.name,
        address: park.address ?? undefined,
        latitude: park.latitude,
        longitude: park.longitude,
        startsAt: startsAt.toISOString(),
        maxParticipants: hasLimit ? limit : undefined,
      };
      if (playdateId) {
        await playdateService.updatePlaydate(playdateId, payload);
        navigation.goBack();
        return;
      }

      await playdateService.createPlaydate({
        ...payload,
        visibility,
        inviteUserIds: visibility === 'INVITE_ONLY' ? invitees : undefined,
      });
      // ParkPicker returns here via navigate(), so it can still be sitting under
      // this screen — goBack() would drop the user back onto the map they already
      // finished with. Send them to the list explicitly instead.
      Alert.alert(
        t('playdates.create.createdTitle'),
        t('playdates.create.createdBody'),
        [{
          text: t('common.ok'),
          onPress: () => navigation.popTo('MainTabs', { screen: 'Playdates' } as never),
        }],
      );
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' });
  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (fetching) {
    return (
      <View style={styles.centered}>
        <FloatingBackground />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {playdateId ? t('playdates.create.editTitle') : t('playdates.create.title')}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabled}
        >

          {/* WHERE */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('playdates.create.parkLabel')}</Text>
            <TouchableOpacity
              style={styles.parkRow}
              onPress={() => navigation.navigate('ParkPicker', park
                ? { initialLat: park.latitude, initialLng: park.longitude }
                : undefined)}
            >
              <Ionicons name="map-outline" size={20} color={Colors.primary} style={{ marginRight: 10 }} />
              {park ? (
                <View style={styles.parkInfo}>
                  <Text style={styles.parkName}>{park.name}</Text>
                  {park.address && <Text style={styles.parkAddress} numberOfLines={1}>{park.address}</Text>}
                </View>
              ) : (
                <Text style={styles.parkPlaceholder}>{t('playdates.create.pickPark')}</Text>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </GlassCard>

          {/* WHEN */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('playdates.create.whenLabel')}</Text>
            <View style={styles.whenRow}>
              <TouchableOpacity style={[styles.input, styles.whenInput]} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.valueText}>{formatDate(startsAt)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.input, styles.timeInput]} onPress={() => setShowTimePicker(true)}>
                <Text style={styles.valueText}>{formatTime(startsAt)}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* DETAILS */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('playdates.create.detailsLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('playdates.create.titleLabel')}
              placeholderTextColor={Colors.textSecondary}
              value={title}
              onChangeText={v => setTitle(v.slice(0, 100))}
            />
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder={t('playdates.create.descriptionLabel')}
              placeholderTextColor={Colors.textSecondary}
              value={description}
              onChangeText={v => setDescription(v.slice(0, 1000))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>{t('playdates.create.limitLabel')}</Text>
              <Switch value={hasLimit} onValueChange={setHasLimit} trackColor={{ true: Colors.primary }} />
            </View>
            {hasLimit && (
              <>
                <Text style={styles.limitValue}>{t('playdates.create.limitValue', { count: limit })}</Text>
                <CustomSlider
                  value={limit} min={2} max={20} step={1} onChange={setLimit}
                  onDragStart={() => setScrollEnabled(false)}
                  onDragEnd={() => setScrollEnabled(true)}
                />
              </>
            )}
          </GlassCard>

          {/* VISIBILITY (immutable when editing) */}
          {!playdateId && (
            <GlassCard style={styles.card}>
              <Text style={styles.sectionLabel}>{t('playdates.create.visibilityLabel')}</Text>
              {VISIBILITY_OPTIONS.map(option => {
                const selected = visibility === option;
                return (
                  <TouchableOpacity key={option} style={[styles.visibilityRow, selected && styles.visibilityRowActive]} onPress={() => setVisibility(option)}>
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selected ? Colors.primary : Colors.textSecondary}
                    />
                    <View style={styles.visibilityTextWrap}>
                      <Text style={[styles.visibilityLabel, selected && styles.visibilityLabelActive]}>
                        {t(VISIBILITY_LABEL_KEYS[option].label)}
                      </Text>
                      <Text style={styles.visibilityHint}>{t(VISIBILITY_LABEL_KEYS[option].hint)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {visibility === 'INVITE_ONLY' && (
                <View style={styles.inviteeSection}>
                  <Text style={styles.inviteeLabel}>{t('playdates.create.invitees')}</Text>
                  {matches.length === 0 ? (
                    <Text style={styles.noMatchesText}>{t('playdates.create.noMatches')}</Text>
                  ) : matches.map(match => {
                    const selected = invitees.includes(match.otherUserId);
                    return (
                      <TouchableOpacity key={match.matchId} style={styles.inviteeRow} onPress={() => toggleInvitee(match.otherUserId)}>
                        {match.otherUserProfilePicture
                          ? <Image source={{ uri: match.otherUserProfilePicture }} style={styles.inviteeAvatar} />
                          : <View style={[styles.inviteeAvatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 14 }}>🐶</Text></View>
                        }
                        <Text style={styles.inviteeName} numberOfLines={1}>{match.otherUserName}</Text>
                        <Ionicons
                          name={selected ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={selected ? Colors.primary : Colors.textSecondary}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </GlassCard>
          )}

          {/* ACTIONS — bare button, no GlassCard wrapper: a glass button inside a
              glass card reads as two stacked panes rather than one control. */}
          {error && <Text style={styles.error}>{error}</Text>}
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={styles.card} />
          ) : (
            <GlassButton onPress={handleSave} style={styles.card}>
              <Text
                style={styles.saveText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                maxFontSizeMultiplier={1.2}
              >
                {playdateId ? t('playdates.create.saveChanges') : t('playdates.create.save')}
              </Text>
            </GlassButton>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date/time pickers — DogForm patterns; first mode="time" usage in the app */}
      {Platform.OS === 'ios' && (
        <Modal visible={showDatePicker || showTimePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }}>
                  <Text style={styles.modalDone}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={startsAt}
                mode={showDatePicker ? 'date' : 'time'}
                display="spinner"
                minimumDate={showDatePicker ? new Date() : undefined}
                onChange={(_, d) => { if (d) (showDatePicker ? setDatePart : setTimePart)(d); }}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={startsAt}
          mode="date"
          minimumDate={new Date()}
          onChange={(_, d) => { setShowDatePicker(false); if (d) setDatePart(d); }}
        />
      )}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={startsAt}
          mode="time"
          onChange={(_, d) => { setShowTimePicker(false); if (d) setTimePart(d); }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.background },
  flex:     { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  scroll: { padding: 20, paddingTop: 4, paddingBottom: 40 },
  card:   { width: '100%', marginBottom: 16 },

  sectionLabel: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },

  parkRow:        { flexDirection: 'row', alignItems: 'center' },
  parkInfo:       { flex: 1, marginRight: 8 },
  parkName:       { fontSize: 15, fontWeight: '600', color: Colors.text },
  parkAddress:    { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  parkPlaceholder:{ flex: 1, fontSize: 15, color: Colors.textSecondary },

  whenRow:   { flexDirection: 'row', gap: 10 },
  whenInput: { flex: 1.6, marginBottom: 0 },
  timeInput: { flex: 1, marginBottom: 0 },

  input: {
    borderWidth: 1.5, borderColor: Colors.glass.inputBorder, borderRadius: 12,
    padding: 14, fontSize: 15, marginBottom: 12, color: Colors.text,
    backgroundColor: Colors.glass.inputBg, justifyContent: 'center',
  },
  valueText:        { fontSize: 15, color: Colors.text },
  descriptionInput: { height: 80 },

  limitRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  limitLabel: { fontSize: 15, color: Colors.text },
  limitValue: { fontSize: 13, color: Colors.primary, fontWeight: '700', marginTop: 6 },

  visibilityRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  visibilityRowActive: {},
  visibilityTextWrap:  { flex: 1 },
  visibilityLabel:     { fontSize: 15, fontWeight: '600', color: Colors.text },
  visibilityLabelActive: { color: Colors.primary },
  visibilityHint:      { fontSize: 12, color: Colors.textSecondary, marginTop: 1, lineHeight: 17 },

  inviteeSection: { marginTop: 8, borderTopWidth: 1, borderTopColor: Colors.glass.divider, paddingTop: 12 },
  inviteeLabel:   { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  noMatchesText:  { fontSize: 13, color: Colors.textSecondary },
  inviteeRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  inviteeAvatar:  { width: 34, height: 34, borderRadius: 17 },
  avatarPlaceholder: { backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  inviteeName:    { flex: 1, fontSize: 14, color: Colors.text },

  error:    { color: Colors.error, marginBottom: 12, textAlign: 'center', fontSize: 14 },
  saveText: { color: Colors.text, fontSize: 16, fontWeight: '700' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(26,10,0,0.35)' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalDone:    { fontSize: 16, color: Colors.primary, fontWeight: '700' },
});
