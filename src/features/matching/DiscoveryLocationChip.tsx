import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { DEFAULT_RADIUS_KM } from '../../constants/discover';
import { usePlaceName } from '../../hooks/usePlaceName';

type Props = Readonly<{
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
  onPress: () => void;
}>;

/**
 * Shows where the Discover feed is centred and how far it reaches.
 *
 * Until now this was invisible: the feed is built around whichever coordinates
 * happen to be saved on the profile, so a stale or missing location quietly
 * produced a wrong or empty deck with nothing on screen to explain it.
 */
export function DiscoveryLocationChip({ latitude, longitude, radiusKm, onPress }: Props) {
  const { t } = useTranslation();
  const placeName = usePlaceName(latitude, longitude);
  const hasLocation = latitude != null && longitude != null;

  let label: string;
  if (!hasLocation) {
    // Without coordinates the server applies no distance filter at all, so this
    // is not just a missing label — the deck really is unbounded.
    label = t('matching.discover.locationMissing');
  } else if (placeName) {
    label = t('matching.discover.searchingNear', {
      place: placeName,
      km: radiusKm ?? DEFAULT_RADIUS_KM,
    });
  } else {
    label = t('matching.discover.searchingWithin', { km: radiusKm ?? DEFAULT_RADIUS_KM });
  }

  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons
        name={hasLocation ? 'location' : 'location-outline'}
        size={14}
        color={hasLocation ? Colors.primary : '#e53e3e'}
      />
      <Text style={styles.text} numberOfLines={1}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={Colors.text} style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    maxWidth: '90%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(46,158,107,0.10)',
  },
  text:    { flexShrink: 1, fontSize: 13, fontWeight: '600', color: Colors.text },
  chevron: { opacity: 0.4 },
});
