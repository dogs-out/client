import { useEffect, useMemo, useState } from 'react';
import {
  FlatList, Modal, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { DOG_BREEDS } from '../../constants/dogBreeds';
import { Colors } from '../../constants/colors';
import { translateBreed } from '../../i18n/translateBreed';

const MIXED = 'Mixed / Unknown';
const ALL_BREEDS = [MIXED, ...DOG_BREEDS];

interface Props {
  visible: boolean;
  value: string | null;
  onChange: (breed: string) => void;
  onClose: () => void;
}

type Step = 'primary' | 'secondary';

export function BreedPickerModal({ visible, value, onChange, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const [step, setStep]         = useState<Step>('primary');
  const [primary, setPrimary]   = useState<string | null>(null);
  const [secondary, setSecondary] = useState<string | null>(null);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    if (!visible) return;
    if (value && value.includes(' / ')) {
      const [p, s] = value.split(' / ');
      setPrimary(p);
      setSecondary(s);
    } else {
      setPrimary(value ?? null);
      setSecondary(null);
    }
    setStep('primary');
    setSearch('');
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return ALL_BREEDS;
    return ALL_BREEDS.filter(b =>
      b.toLowerCase().includes(q) || translateBreed(b, i18n.language).toLowerCase().includes(q)
    );
  }, [search, i18n.language]);

  const selectPrimary = (breed: string) => {
    setPrimary(breed);
    setSecondary(null);
    setStep('primary');
    setSearch('');
  };

  const confirm = () => {
    if (!primary) return;
    const result = secondary ? `${primary} / ${secondary}` : primary;
    onChange(result);
    onClose();
  };

  const title = step === 'primary' ? t('dogs.breedPicker.selectBreed') : t('dogs.breedPicker.selectSecondBreed');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={step === 'secondary' ? () => { setStep('primary'); setSearch(''); } : onClose}>
            <Ionicons name={step === 'secondary' ? 'chevron-back' : 'close'} size={26} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 26 }} />
        </View>

        {/* Selected summary */}
        {primary && (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionText} numberOfLines={1}>
              {translateBreed(secondary ? `${primary} / ${secondary}` : primary, i18n.language)}
            </Text>
            {step === 'primary' && primary !== MIXED && (
              <TouchableOpacity onPress={() => { setStep('secondary'); setSearch(''); }} style={styles.mixButton}>
                <Ionicons name="add-circle-outline" size={16} color={Colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.mixButtonText}>{t('dogs.breedPicker.addMix')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('dogs.breedPicker.searchPlaceholder')}
            placeholderTextColor={Colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Breed list */}
        <FlatList
          data={filtered}
          keyExtractor={item => item}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = step === 'primary' ? item === primary : item === secondary;
            return (
              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  if (step === 'primary') {
                    selectPrimary(item);
                  } else {
                    setSecondary(item === primary ? null : item);
                    setStep('primary');
                    setSearch('');
                  }
                }}
              >
                <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>{translateBreed(item, i18n.language)}</Text>
                {isSelected && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        {/* Confirm */}
        {primary && step === 'primary' && (
          <TouchableOpacity style={styles.confirmButton} onPress={confirm}>
            <Text style={styles.confirmText}>{t('dogs.breedPicker.confirm')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  header:       {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: Colors.text },

  selectionBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: 'rgba(46,158,107,0.07)', borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  selectionText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.primary },
  mixButton:    { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  mixButtonText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  searchRow:    {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: Colors.glass.inputBorder,
    borderRadius: 12, backgroundColor: Colors.glass.inputBg,
  },
  searchIcon:   { marginRight: 8 },
  searchInput:  { flex: 1, fontSize: 16, color: Colors.text },

  item:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  itemText:     { fontSize: 16, color: Colors.text },
  itemTextSelected: { color: Colors.primary, fontWeight: '600' },
  separator:    { height: 1, backgroundColor: Colors.glass.divider, marginLeft: 16 },

  confirmButton: {
    margin: 16, padding: 16, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  confirmText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});
