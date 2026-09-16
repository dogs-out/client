import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { ReportUserModal } from '../../components/ReportUserModal';
import { sitterService, SitterReview } from '../../services/sitterService';
import { moderationService, REVIEW_REPORT_REASONS } from '../../services/moderationService';
import { translateTag } from '../../i18n/translateTag';

type Props = NativeStackScreenProps<RootStackParamList, 'SitterReviews'>;

/** Five characters that read as a rating at a glance, without a legend. */
function Stars({ count, size = 15 }: Readonly<{ count: number; size?: number }>) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map(value => (
        <Ionicons
          key={value}
          name={value <= count ? 'star' : 'star-outline'}
          size={size}
          color={value <= count ? '#E8B931' : Colors.border}
        />
      ))}
    </View>
  );
}

/**
 * What previous owners thought of a sitter.
 *
 * <p>The average sits above the list rather than replacing it: "4.6" is what
 * people scan, and the individual reviews are what they actually read before
 * handing over a key.
 *
 * <p>Every comment can be reported, including by the sitter it is about. Unlike a
 * chat message there is no conversation to leave and nobody to block, so the
 * report is the only thing the subject of a comment can do about it.
 */
export default function SitterReviewsScreen({ navigation, route }: Readonly<Props>) {
  const { t } = useTranslation();
  const { sitterId, name } = route.params;

  const [reviews, setReviews] = useState<SitterReview[]>([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState<SitterReview | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([sitterService.getReviews(sitterId), sitterService.getRating(sitterId)])
      .then(([list, rating]) => {
        setReviews(list);
        setAverage(rating.average);
        setCount(rating.count);
      })
      .catch(() => { /* an empty list says the same thing as an error here */ })
      .finally(() => setLoading(false));
  }, [sitterId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submitReport = async (reason: string, message: string) => {
    if (!reporting) return;
    await moderationService.reportReview(reporting.id, reason, message);
    setReporting(null);
    Alert.alert(t('chat.chatDetail.reportSentTitle'), t('sitter.reviews.reportThanks'));
    // The comment is hidden server-side the moment it is reported, so a reload
    // shows the result rather than leaving it on screen.
    load();
  };

  const renderReview = ({ item }: { item: SitterReview }) => (
    <GlassCard style={styles.card}>
      <View style={styles.head}>
        {item.raterProfilePicture
          ? <RemoteImage source={{ uri: item.raterProfilePicture }} style={styles.avatar} />
          : <View style={[styles.avatar, styles.avatarPlaceholder]}><Text>🐶</Text></View>}
        <View style={styles.headBody}>
          <Text style={styles.raterName} numberOfLines={1}>{item.raterName}</Text>
          <Stars count={item.stars} />
        </View>
        {!item.mine && (
          <TouchableOpacity
            onPress={() => setReporting(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('sitter.reviews.reportComment')}
          >
            <Ionicons name="flag-outline" size={17} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {item.tags.length > 0 && (
        <View style={styles.tagWrap}>
          {item.tags.map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{translateTag(tag, t)}</Text>
            </View>
          ))}
        </View>
      )}

      {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
    </GlassCard>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t('sitter.reviews.title', { name })}</Text>
        <View style={{ width: 26 }} />
      </View>

      {count > 0 && (
        <View style={styles.summary}>
          <Text style={styles.average}>{average.toFixed(1)}</Text>
          <View>
            <Stars count={Math.round(average)} size={17} />
            <Text style={styles.summaryCount}>{t('sitter.reviews.count', { count })}</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={r => String(r.id)}
          renderItem={renderReview}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.empty}>{t('sitter.reviews.empty', { name })}</Text>
            </View>
          }
        />
      )}

      <ReportUserModal
        visible={reporting !== null}
        name={reporting?.raterName ?? ''}
        reasons={REVIEW_REPORT_REASONS}
        onClose={() => setReporting(null)}
        onSubmit={submitReport}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: Colors.text },

  summary: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingBottom: 14,
  },
  average: { fontSize: 38, fontWeight: '800', color: Colors.text },
  summaryCount: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },

  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { marginBottom: 10 },

  head:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headBody: { flex: 1 },
  avatar:   { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  raterName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  starRow:   { flexDirection: 'row', gap: 1, marginTop: 3 },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: {
    paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 11, backgroundColor: 'rgba(46,158,107,0.12)',
  },
  tagText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

  comment: { fontSize: 14, color: Colors.text, lineHeight: 20, marginTop: 10 },

  centered: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 },
  empty:    { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
