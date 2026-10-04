import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { translateTag } from '../i18n/translateTag';
import { Colors } from '../constants/colors';
import { DEFAULT_RADIUS_KM } from '../constants/discover';
import { GlassCard } from './GlassCard';
import { CustomSlider } from './CustomSlider';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const TIME_SLOTS = ['Morning', 'Afternoon', 'Evening'] as const;

/**
 * The "when" and "how far" filter shared by the Dogsitting lists and Playdates:
 * a day-and-time pill and a distance pill on one line, each opening its panel
 * underneath at full width, only ever one at a time.
 *
 * <p>Empty day and time lists mean "any"; several mean any one of them. The
 * distance is the account's search distance, shared with Discover, so it is
 * only committed when the slider is released.
 */
export function WhenWhereFilter({
  showWhen, showRadius,
  weekdays, onWeekdaysChange, timeSlots, onTimeSlotsChange,
  radiusKm, onRadiusChange, onRadiusCommit,
}: Readonly<{
  showWhen: boolean;
  showRadius: boolean;
  weekdays: string[];
  onWeekdaysChange: (next: string[]) => void;
  timeSlots: string[];
  onTimeSlotsChange: (next: string[]) => void;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  onRadiusCommit: () => void;
}>) {
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const [whenOpen, setWhenOpen] = useState(false);
  const [radiusOpen, setRadiusOpen] = useState(false);

  if (!showWhen && !showRadius) return null;

  /**
   * One day reads better as its own name than as "1 day", and past two the names
   * stop fitting on half a row — so a count takes over.
   */
  const whenLabel = (() => {
    const days = (() => {
      if (weekdays.length === 0) return t('sitter.jobs.anyDay');
      if (weekdays.length === 1) return translateTag(weekdays[0], t);
      return t('sitter.jobs.daysPicked', { count: weekdays.length });
    })();
    if (timeSlots.length === 0) return days;
    const times = timeSlots.length === 1
      ? t(`sitter.jobs.slotShort.${timeSlots[0]}`)
      : t('sitter.jobs.slotsPicked', { count: timeSlots.length });
    return `${days} · ${times}`;
  })();

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  return (
    <View style={styles.block}>
      <View style={styles.row}>
        {showWhen && (
          <TouchableOpacity
            style={[styles.pill, styles.pillFlex]}
            onPress={() => { setWhenOpen(open => !open); setRadiusOpen(false); }}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={15} color={Colors.primary} />
            <Text style={styles.pillText} numberOfLines={1}>{whenLabel}</Text>
            <Ionicons name={whenOpen ? 'chevron-up' : 'chevron-down'} size={15} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}

        {showRadius && (
          <TouchableOpacity
            style={[styles.pill, styles.pillFlex]}
            onPress={() => { setRadiusOpen(open => !open); setWhenOpen(false); }}
            activeOpacity={0.7}
          >
            <Ionicons name="location-outline" size={15} color={Colors.primary} />
            <Text style={styles.pillText} numberOfLines={1}>{t('sitter.list.withinKm', { km: radiusKm })}</Text>
            <Ionicons name={radiusOpen ? 'chevron-up' : 'chevron-down'} size={15} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {showWhen && whenOpen && (
        <GlassCard style={styles.card} padding={6}>
          {/* Scrolls inside a capped height: seven days plus three times of day
              run past the tab bar on most phones. Stays open as options are
              tapped, since picking two days is two taps. */}
          <ScrollView style={{ maxHeight: Math.round(windowHeight * 0.5) }} nestedScrollEnabled>
            <TouchableOpacity style={styles.option} onPress={() => { onWeekdaysChange([]); onTimeSlotsChange([]); }}>
              <Text style={[styles.optionText, weekdays.length + timeSlots.length === 0 && styles.optionTextActive]}>
                {t('sitter.jobs.anyTime')}
              </Text>
              {weekdays.length + timeSlots.length === 0 && <Ionicons name="checkmark" size={17} color={Colors.primary} />}
            </TouchableOpacity>

            {WEEKDAYS.map(day => {
              const active = weekdays.includes(day);
              return (
                <TouchableOpacity key={day} style={styles.option} onPress={() => onWeekdaysChange(toggle(weekdays, day))}>
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{translateTag(day, t)}</Text>
                  <Ionicons name={active ? 'checkbox' : 'square-outline'} size={19} color={active ? Colors.primary : Colors.border} />
                </TouchableOpacity>
              );
            })}

            <Text style={styles.section}>{t('sitter.jobs.timeOfDay')}</Text>
            {TIME_SLOTS.map(slot => {
              const active = timeSlots.includes(slot);
              return (
                <TouchableOpacity key={slot} style={styles.option} onPress={() => onTimeSlotsChange(toggle(timeSlots, slot))}>
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{translateTag(slot, t)}</Text>
                  <Ionicons name={active ? 'checkbox' : 'square-outline'} size={19} color={active ? Colors.primary : Colors.border} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </GlassCard>
      )}

      {showRadius && radiusOpen && (
        <GlassCard style={styles.card} padding={16}>
          <View style={styles.radiusLabels}>
            <Text style={styles.radiusEdge}>1 km</Text>
            <Text style={styles.radiusValue}>{t('sitter.list.withinKm', { km: radiusKm })}</Text>
            <Text style={styles.radiusEdge}>{DEFAULT_RADIUS_KM} km</Text>
          </View>
          <CustomSlider
            value={radiusKm}
            min={1}
            max={DEFAULT_RADIUS_KM}
            step={1}
            onChange={onRadiusChange}
            onDragEnd={onRadiusCommit}
          />
          <Text style={styles.radiusHint}>{t('sitter.list.radiusHint')}</Text>
        </GlassCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: 20, marginBottom: 8 },
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: 'rgba(46,158,107,0.08)',
  },
  // Equal halves, so the two pills line up however long their labels are.
  pillFlex: { flex: 1 },
  pillText: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.text },
  card:     { marginTop: 8 },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, paddingHorizontal: 10,
  },
  optionText:       { fontSize: 15, color: Colors.textSecondary },
  optionTextActive: { color: Colors.text, fontWeight: '700' },
  section: {
    fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.4,
    textTransform: 'uppercase', paddingHorizontal: 10, paddingTop: 12, paddingBottom: 2,
  },
  radiusLabels: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  radiusEdge:   { fontSize: 12, color: Colors.textSecondary },
  radiusValue:  { fontSize: 15, fontWeight: '700', color: Colors.text },
  radiusHint:   { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginTop: 4 },
});
