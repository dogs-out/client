import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/colors';
import { RemoteImage } from './ui/RemoteImage';
import { Dog, DogSex, dogService } from '../services/dogService';
import { userService } from '../services/userService';
import { useHoldPopupGate } from '../utils/popupGate';

type Answer = { sex: DogSex | null; neutered: boolean | null };

/** A dog saved before the form asked for these is missing at least one of them. */
export function needsDetails(dog: Pick<Dog, 'sex' | 'neutered'>): boolean {
  return dog.sex == null || dog.neutered == null;
}

/**
 * Asks owners of dogs saved before the dog form required it for whether
 * the dog is neutered, and its sex for dogs older than that question too.
 *
 * <p>Required, like the form: there is no close button, because "later" is how the
 * answer ends up missing on every profile it should be on. It is two taps per dog.
 * Once every dog has both answers it never shows again, so it needs no "seen" flag.
 *
 * <p>Mounted with the main tabs, so it only runs for a signed-in user.
 */
export function DogDetailsPrompt() {
  const { t } = useTranslation();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Admins get it on every start with all their dogs, answers filled in, to check
    // how it looks. Everyone else only for dogs that miss an answer.
    Promise.all([dogService.getMyDogs(), userService.getMe().then(me => me.role === 'ADMIN').catch(() => false)])
      .then(([mine, admin]) => {
        const missing = admin ? mine : mine.filter(needsDetails);
        setDogs(missing);
        setAnswers(Object.fromEntries(missing.map(d => [d.id, { sex: d.sex ?? null, neutered: d.neutered ?? null }])));
      })
      // Not knowing is no reason to block the app; the next launch asks again.
      .catch(() => {});
  }, []);

  useHoldPopupGate(dogs.length > 0);

  if (dogs.length === 0) return null;

  const set = (id: number, patch: Partial<Answer>) =>
    setAnswers(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const complete = dogs.every(d => answers[d.id]?.sex && answers[d.id]?.neutered != null);

  const save = async () => {
    if (!complete) { setError(t('dogs.detailsPrompt.incomplete')); return; }
    setSaving(true);
    setError(null);
    try {
      for (const dog of dogs) {
        const a = answers[dog.id];
        // The name goes along because the server validates it on every update.
        await dogService.updateDog(dog.id, { name: dog.name, sex: a.sex ?? undefined, neutered: a.neutered ?? undefined });
      }
      setDogs([]);
    } catch {
      setError(t('dogs.detailsPrompt.failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    // Full screen rather than a card over the deck: a translucent card on top of
    // a dog photo read as a smudge. Back on Android does nothing on purpose — the
    // answers are required.
    <Modal visible animationType="slide" onRequestClose={() => {}}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.emoji}>🐾</Text>
          <Text style={styles.title}>{t('dogs.detailsPrompt.title')}</Text>
          <Text style={styles.body}>{t('dogs.detailsPrompt.body')}</Text>

          {dogs.map(dog => {
            const a = answers[dog.id] ?? { sex: null, neutered: null };
            return (
              <View key={dog.id} style={styles.dogCard}>
                <View style={styles.dogHead}>
                  {dog.profilePicture
                    ? <RemoteImage source={{ uri: dog.profilePicture }} style={styles.dogPhoto} />
                    : <View style={[styles.dogPhoto, styles.dogPhotoEmpty]}><Text style={{ fontSize: 22 }}>🐶</Text></View>}
                  <Text style={styles.dogName}>{dog.name}</Text>
                </View>
                {dog.sex == null && (
                  <View style={styles.row}>
                    {(['MALE', 'FEMALE'] as const).map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.chip, a.sex === opt && styles.chipActive]}
                        onPress={() => set(dog.id, { sex: opt })}
                        testID={`details-sex-${dog.id}-${opt}`}
                      >
                        <Text style={[styles.chipText, a.sex === opt && styles.chipTextActive]}>
                          {opt === 'MALE' ? '♂ ' : '♀ '}{t(`dogs.sex.${opt}`)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <View style={styles.row}>
                  {([true, false] as const).map(opt => (
                    <TouchableOpacity
                      key={String(opt)}
                      style={[styles.chip, a.neutered === opt && styles.chipActive]}
                      onPress={() => set(dog.id, { neutered: opt })}
                      testID={`details-neutered-${dog.id}-${opt ? 'yes' : 'no'}`}
                    >
                      <Text style={[styles.chipText, a.neutered === opt && styles.chipTextActive]}>
                        {t(opt ? 'dogs.neutered.yes' : 'dogs.neutered.no')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}

          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.primary, (!complete || saving) && styles.primaryDisabled]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.8}
            testID="details-save"
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryText}>{t('dogs.detailsPrompt.save')}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Plain white: the drifting icons and glass made this busy for a required question.
  safe:    { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  emoji:   { fontSize: 52, marginBottom: 14, textAlign: 'center' },
  title:   { fontSize: 22, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  body:    { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 22 },

  dogCard: {
    marginBottom: 14, padding: 16, borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  dogHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  dogPhoto: { width: 52, height: 52, borderRadius: 26 },
  dogPhotoEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46,158,107,0.12)' },
  dogName: { fontSize: 18, fontWeight: '800', color: Colors.text, flexShrink: 1 },

  // The dog form's option chips, so answering here feels like the form itself.
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  chip: {
    flex: 1, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.glass.inputBg,
  },
  chipActive:     { borderColor: Colors.primary, backgroundColor: 'rgba(46,158,107,0.12)' },
  chipText:       { fontSize: 14, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '700' },

  error: { color: Colors.error, fontSize: 13, textAlign: 'center', marginBottom: 10 },
  primary: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary,
    borderRadius: 24, paddingVertical: 14, marginTop: 8,
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
