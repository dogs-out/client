import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Keyboard, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { playdateService, PlaceResult } from '../../services/playdateService';
import { userService } from '../../services/userService';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'ParkPicker'>;

const DEFAULT_REGION = {
  latitude: 47.3769, longitude: 8.5417, // Zürich, better than the Atlantic
  latitudeDelta: 0.05, longitudeDelta: 0.05,
};

export default function ParkPickerScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState(
    route.params?.initialLat != null && route.params?.initialLng != null
      ? { latitude: route.params.initialLat, longitude: route.params.initialLng, latitudeDelta: 0.02, longitudeDelta: 0.02 }
      : DEFAULT_REGION
  );
  const [selected, setSelected] = useState<PlaceResult | null>(
    route.params?.initialLat != null && route.params?.initialLng != null ? null : null
  );
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Center on the user: device GPS first, stored profile location as fallback
  useEffect(() => {
    if (route.params?.initialLat != null) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const next = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
          setRegion(next);
          mapRef.current?.animateToRegion(next, 400);
          return;
        }
      } catch { /* fall through to profile location */ }
      try {
        const me = await userService.getMe();
        if (me.latitude != null && me.longitude != null) {
          const next = { latitude: me.latitude, longitude: me.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
          setRegion(next);
          mapRef.current?.animateToRegion(next, 400);
        }
      } catch { /* keep default */ }
    })();
  }, [route.params?.initialLat]);

  const search = (text: string) => {
    setQuery(text);
    setSearchError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      playdateService.searchParks(text.trim(), region.latitude, region.longitude)
        .then(found => { setResults(found); if (found.length === 0) setSearchError(t('playdates.parkPicker.noResults')); })
        .catch(err => {
          setResults([]);
          setSearchError(err?.response?.status === 503
            ? t('playdates.parkPicker.searchUnavailable')
            : t('playdates.parkPicker.searchFailed'));
        })
        .finally(() => setSearching(false));
    }, 400);
  };

  const pickResult = (place: PlaceResult) => {
    Keyboard.dismiss();
    setResults([]);
    setQuery(place.name);
    setSelected(place);
    mapRef.current?.animateToRegion({
      latitude: place.latitude, longitude: place.longitude,
      latitudeDelta: 0.01, longitudeDelta: 0.01,
    }, 400);
  };

  // Long-press fallback: works without any Places key
  const dropPin = async (latitude: number, longitude: number) => {
    let name = t('playdates.parkPicker.droppedPin');
    let address: string | null = null;
    try {
      const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
      const g = geocoded[0];
      if (g) {
        name = g.name ?? g.street ?? name;
        address = [g.street, g.city].filter(Boolean).join(', ') || null;
      }
    } catch { /* keep generic name */ }
    setSelected({ name, address, latitude, longitude });
  };

  const confirm = () => {
    if (!selected) return;
    navigation.navigate('CreatePlaydate', { pickedPark: selected });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        onLongPress={e => dropPin(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
        showsUserLocation
      >
        {selected && (
          <Marker
            coordinate={{ latitude: selected.latitude, longitude: selected.longitude }}
            title={selected.name}
            pinColor={Colors.primary}
          />
        )}
      </MapView>

      {/* Header + search */}
      <View style={styles.topOverlay}>
        <View style={styles.searchRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('playdates.parkPicker.searchPlaceholder')}
              placeholderTextColor={Colors.textSecondary}
              value={query}
              onChangeText={search}
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color={Colors.primary} />}
          </View>
        </View>

        {(results.length > 0 || searchError) && (
          <View style={styles.resultsBox}>
            {searchError ? (
              <Text style={styles.searchError}>{searchError}</Text>
            ) : (
              <FlatList
                data={results}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(item, i) => `${item.latitude},${item.longitude},${i}`}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.resultRow} onPress={() => pickResult(item)}>
                    <Ionicons name="leaf-outline" size={18} color={Colors.primary} style={{ marginRight: 10 }} />
                    <View style={styles.resultText}>
                      <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                      {item.address && <Text style={styles.resultAddress} numberOfLines={1}>{item.address}</Text>}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}
      </View>

      {/* Bottom confirm */}
      <View style={styles.bottomOverlay}>
        <Text style={styles.hint}>{t('playdates.parkPicker.longPressHint')}</Text>
        {selected && (
          <View style={styles.selectedBox}>
            <Text style={styles.selectedName} numberOfLines={1}>{selected.name}</Text>
            {selected.address && <Text style={styles.selectedAddress} numberOfLines={1}>{selected.address}</Text>}
          </View>
        )}
        <TouchableOpacity
          style={[styles.confirmBtn, !selected && styles.confirmBtnDisabled]}
          onPress={confirm}
          disabled={!selected}
        >
          <Text style={styles.confirmText}>{t('playdates.parkPicker.confirm')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  topOverlay: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 16, left: 12, right: 12 },
  searchRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.glass.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    height: 44, paddingHorizontal: 14, borderRadius: 22,
    backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.glass.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },

  resultsBox: {
    marginTop: 8, borderRadius: 16, backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.glass.border, maxHeight: 260, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4,
  },
  resultRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.glass.divider },
  resultText:    { flex: 1 },
  resultName:    { fontSize: 14, fontWeight: '600', color: Colors.text },
  resultAddress: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  searchError:   { padding: 14, fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },

  bottomOverlay: { position: 'absolute', left: 16, right: 16, bottom: Platform.OS === 'ios' ? 40 : 24 },
  hint: {
    alignSelf: 'center', fontSize: 12, color: Colors.text,
    backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 12, overflow: 'hidden', marginBottom: 8,
  },
  selectedBox: {
    backgroundColor: Colors.background, borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1.5, borderColor: Colors.glass.border,
  },
  selectedName:    { fontSize: 15, fontWeight: '700', color: Colors.text },
  selectedAddress: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

  confirmBtn: {
    height: 50, borderRadius: 16, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
