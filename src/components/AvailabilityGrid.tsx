import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/colors';
import { TIME_SLOTS, WEEKDAYS } from '../constants/tags';
import { translateTag } from '../i18n/translateTag';
import { pair } from '../utils/availability';

interface Props {
  value: string[];
  /** Omit for a read-only grid, as shown on someone's profile. */
  onChange?: (next: string[]) => void;
}

/** 2026-09-28 was a Monday — any Monday works, it only names the weekdays in the user's language. */
const A_MONDAY = new Date(2026, 8, 28);

/**
 * A sitter's week: weekdays down, times of day across, one tap per cell.
 * Tapping a day's name toggles that whole row, which is how most people think
 * about it ("I'm free on Saturdays") before narrowing it down.
 */
export function AvailabilityGrid({ value, onChange }: Readonly<Props>) {
  const { t, i18n } = useTranslation();
  const selected = new Set(value);
  const editable = !!onChange;

  const dayName = (i: number) => {
    const d = new Date(A_MONDAY);
    d.setDate(A_MONDAY.getDate() + i);
    return d.toLocaleDateString(i18n.language, { weekday: 'short' });
  };

  const toggle = (cell: string) => {
    if (!onChange) return;
    onChange(selected.has(cell) ? value.filter(v => v !== cell) : [...value, cell]);
  };

  const toggleRow = (day: string) => {
    if (!onChange) return;
    const row = TIME_SLOTS.map(s => pair(day, s));
    const allOn = row.every(c => selected.has(c));
    onChange(allOn ? value.filter(v => !row.includes(v)) : [...value.filter(v => !row.includes(v)), ...row]);
  };

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.dayCell} />
        {TIME_SLOTS.map(slot => {
          const [name, hours] = translateTag(slot, t).split(' · ');
          return (
            <View key={slot} style={styles.headCell}>
              <Text style={styles.headName} numberOfLines={1}>{name}</Text>
              {hours ? <Text style={styles.headHours}>{hours}</Text> : null}
            </View>
          );
        })}
      </View>

      {WEEKDAYS.map((day, i) => (
        <View key={day} style={styles.row}>
          <TouchableOpacity style={styles.dayCell} disabled={!editable} onPress={() => toggleRow(day)}>
            <Text style={styles.dayText}>{dayName(i)}</Text>
          </TouchableOpacity>
          {TIME_SLOTS.map(slot => {
            const cell = pair(day, slot);
            const on = selected.has(cell);
            return (
              <TouchableOpacity
                key={cell}
                style={[styles.cell, on && styles.cellOn]}
                disabled={!editable}
                onPress={() => toggle(cell)}
                accessibilityRole={editable ? 'checkbox' : undefined}
                accessibilityState={editable ? { checked: on } : undefined}
                accessibilityLabel={`${translateTag(day, t)}, ${translateTag(slot, t)}`}
              >
                {on && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  dayCell:  { width: 44, justifyContent: 'center' },
  dayText:  { fontSize: 13, fontWeight: '700', color: Colors.text },
  headCell: { flex: 1, alignItems: 'center' },
  headName: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  headHours: { fontSize: 10, color: Colors.textSecondary },
  cell: {
    flex: 1, height: 32, borderRadius: 9,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.glass.inputBg,
    alignItems: 'center', justifyContent: 'center',
  },
  cellOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
});
