import { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { KEYBOARD_BEHAVIOR } from '../../utils/keyboardBehavior';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { sitterService } from '../../services/sitterService';
import { translateTag } from '../../i18n/translateTag';
import { getApiError } from '../../utils/apiError';

type Props = NativeStackScreenProps<RootStackParamList, 'RateSitter'>;

const MAX_TAGS = 3;
const STARS = [1, 2, 3, 4, 5] as const;

/**
 * How it went with the sitter.
 *
 * <p>Stars are the only required part. A rating form that demands prose is a
 * rating form most people close, and one star out of five from someone who could
 * not be bothered to explain is still worth more than silence.
 *
 * <p>The highlight tags exist for the praise people would otherwise not type.
 * "She sent photos" is the single most useful thing a future owner can read and
 * almost nobody writes it unprompted — as a chip it costs one tap. Three at most,
 * because a review where everything is highlighted highlights nothing.
 */
export default function RateSitterScreen({ navigation, route }: Readonly<Props>) {
  const { t } = useTranslation();
  const { job } = route.params;

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // From the server rather than a local list: it validates against its own copy,
  // so a tag invented here would be rejected on submit and look like a bug.
  useEffect(() => {
    sitterService.getReviewTags().then(setAvailable).catch(() => setAvailable([]));
  }, []);

  const toggleTag = (tag: string) => {
    setTags(prev => {
      if (prev.includes(tag)) return prev.filter(x => x !== tag);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  };

  const submit = async () => {
    if (stars === 0) { setError(t('sitter.rate.pickStars')); return; }
    setSaving(true);
    setError(null);
    try {
      await sitterService.submitReview({
        requestId: job.id,
        stars,
        comment: comment.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      navigation.goBack();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const full = tags.length >= MAX_TAGS;

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('sitter.rate.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={KEYBOARD_BEHAVIOR}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <GlassCard style={styles.card}>
            <View style={styles.sitterRow}>
              {job.sitterProfilePicture
                ? <RemoteImage source={{ uri: job.sitterProfilePicture }} style={styles.avatar} />
                : <View style={[styles.avatar, styles.avatarPlaceholder]}><Text>🐶</Text></View>}
              <View style={styles.sitterBody}>
                <Text style={styles.sitterName} numberOfLines={1}>{job.sitterName}</Text>
                <Text style={styles.sitterHint}>{t('sitter.rate.subtitle')}</Text>
              </View>
            </View>

            <View style={styles.starRow}>
              {STARS.map(value => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setStars(value)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('sitter.rate.starsLabel', { count: value })}
                >
                  <Ionicons
                    name={value <= stars ? 'star' : 'star-outline'}
                    size={38}
                    color={value <= stars ? '#E8B931' : Colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          {available.length > 0 && (
            <GlassCard style={styles.card}>
              <Text style={styles.sectionLabel}>{t('sitter.rate.highlightsLabel')}</Text>
              <Text style={styles.sectionHint}>{t('sitter.rate.highlightsHint', { count: MAX_TAGS })}</Text>
              <View style={styles.tagWrap}>
                {available.map(tag => {
                  const picked = tags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tag,
                        picked && styles.tagPicked,
                        // Dimmed rather than hidden once three are picked: the
                        // options staying put is what makes the limit legible.
                        !picked && full && styles.tagDisabled,
                      ]}
                      onPress={() => toggleTag(tag)}
                      disabled={!picked && full}
                    >
                      <Text style={[styles.tagText, picked && styles.tagTextPicked]}>
                        {translateTag(tag, t)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </GlassCard>
          )}

          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('sitter.rate.commentLabel')}</Text>
            <TextInput
              style={styles.commentInput}
              placeholder={t('sitter.rate.commentPlaceholder')}
              placeholderTextColor={Colors.textSecondary}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={1000}
            />
          </GlassCard>

          {error && <Text style={styles.error}>{error}</Text>}

          <GlassButton onPress={submit} disabled={saving} style={styles.submit}>
            {saving
              ? <ActivityIndicator color={Colors.text} />
              : <Text style={styles.submitText}>{t('sitter.rate.submit')}</Text>}
          </GlassButton>

          <TouchableOpacity style={styles.skip} onPress={() => navigation.goBack()}>
            <Text style={styles.skipText}>{t('sitter.rate.later')}</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  card: { marginBottom: 14 },

  sitterRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sitterBody: { flex: 1 },
  avatar:     { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  sitterName: { fontSize: 17, fontWeight: '800', color: Colors.text },
  sitterHint: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 18 },

  sectionLabel: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, marginBottom: 4 },
  sectionHint:  { fontSize: 12, color: Colors.textSecondary, marginBottom: 10 },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
  },
  tagPicked:   { borderColor: Colors.primary, backgroundColor: 'rgba(46,158,107,0.12)' },
  tagDisabled: { opacity: 0.4 },
  tagText:       { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tagTextPicked: { color: Colors.primary },

  commentInput: {
    minHeight: 92, textAlignVertical: 'top',
    fontSize: 15, color: Colors.text, paddingTop: 4,
  },

  error: { color: Colors.error, fontSize: 14, marginBottom: 10, textAlign: 'center' },
  submit: { marginTop: 4 },
  submitText: { fontSize: 16, fontWeight: '800', color: Colors.text },
  skip: { alignItems: 'center', paddingVertical: 14 },
  skipText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
});
