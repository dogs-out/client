import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Image, Modal, PanResponder,
  StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/colors';

/** Matches the feed rendition the server produces, so what you frame is what shows. */
const FRAME_RATIO = 3 / 4;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

interface Props {
  /** Local file URI of the picked photo; null closes the editor. */
  uri: string | null;
  onCancel: () => void;
  onDone: (croppedUri: string) => void;
}

/**
 * Pinch and drag a photo into the frame before it is saved.
 *
 * <p>The picker's own crop step only exists for single selection, so it went away
 * when photos became multi-select — this puts framing back, and puts it in one
 * place for both profile and dog photos.
 *
 * <p>Built on PanResponder rather than a gesture library on purpose: two fingers
 * and a rectangle is the whole interaction, and the alternative meant Reanimated's
 * worklet toolchain — a babel plugin, a companion package and the new architecture
 * — for a screen this small.
 */
export function PhotoCropModal({ uri, onCancel, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [working, setWorking] = useState(false);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);

  const frameW = width - 48;
  const frameH = frameW / FRAME_RATIO;

  // Committed values, and the live ones the gesture writes to.
  const state = useRef({ scale: 1, x: 0, y: 0, startDistance: 0, startScale: 1, startX: 0, startY: 0 });
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  // Every photo starts unzoomed and centred. Without this the editor opens on the
  // next photo still holding the last one's zoom and offset — which is wrong on
  // its own, and glaring now that picking several photos walks through them all.
  useEffect(() => {
    if (!uri) return;
    setNatural(null);
    state.current = { scale: 1, x: 0, y: 0, startDistance: 0, startScale: 1, startX: 0, startY: 0 };
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
  }, [uri, scale, translateX, translateY]);

  /** Keeps the photo covering the frame, so no empty corner can be saved. */
  const clampOffsets = () => {
    const s = state.current.scale;
    const maxX = Math.max(0, (frameW * s - frameW) / 2);
    const maxY = Math.max(0, (frameH * s - frameH) / 2);
    state.current.x = clamp(state.current.x, -maxX, maxX);
    state.current.y = clamp(state.current.y, -maxY, maxY);
    translateX.setValue(state.current.x);
    translateY.setValue(state.current.y);
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      state.current.startScale = state.current.scale;
      state.current.startX = state.current.x;
      state.current.startY = state.current.y;
      state.current.startDistance = 0;
    },
    onPanResponderMove: (e, gesture) => {
      const touches = e.nativeEvent.touches;

      if (touches.length >= 2) {
        const [a, b] = touches;
        const distance = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
        // First frame of the pinch sets the reference the ratio is measured from.
        if (state.current.startDistance === 0) {
          state.current.startDistance = distance;
          state.current.startScale = state.current.scale;
          return;
        }
        state.current.scale = clamp(
          state.current.startScale * (distance / state.current.startDistance),
          MIN_SCALE, MAX_SCALE);
        scale.setValue(state.current.scale);
        clampOffsets();
        return;
      }

      state.current.x = state.current.startX + gesture.dx;
      state.current.y = state.current.startY + gesture.dy;
      clampOffsets();
    },
    onPanResponderRelease: () => { state.current.startDistance = 0; },
    onPanResponderTerminate: () => { state.current.startDistance = 0; },
  })).current;

  const apply = async () => {
    if (!uri || !natural) return;
    setWorking(true);
    try {
      // The frame shows the image scaled to cover it; translate that back into
      // pixels of the original, which is what the manipulator crops in.
      const cover = Math.max(frameW / natural.width, frameH / natural.height);
      const shown = cover * state.current.scale;
      const cropW = Math.min(natural.width, frameW / shown);
      const cropH = Math.min(natural.height, frameH / shown);
      const originX = clamp((natural.width - cropW) / 2 - state.current.x / shown, 0, natural.width - cropW);
      const originY = clamp((natural.height - cropH) / 2 - state.current.y / shown, 0, natural.height - cropH);

      const context = ImageManipulator.manipulate(uri);
      context.crop({
        originX: Math.round(originX),
        originY: Math.round(originY),
        width: Math.round(cropW),
        height: Math.round(cropH),
      });
      const image = await context.renderAsync();
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
      onDone(saved.uri);
    } catch {
      // Cropping is a convenience; the original is still a perfectly good photo.
      onDone(uri);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal visible={uri !== null} animationType="slide" onRequestClose={onCancel} transparent={false}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('photoCrop.title')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.stage}>
          <View style={[styles.frame, { width: frameW, height: frameH }]} {...pan.panHandlers}>
            {uri && (
              <Animated.Image
                source={{ uri }}
                onLoad={e => setNatural({
                  width: e.nativeEvent.source.width,
                  height: e.nativeEvent.source.height,
                })}
                style={[
                  { width: frameW, height: frameH },
                  { transform: [{ translateX }, { translateY }, { scale }] },
                ]}
                resizeMode="cover"
              />
            )}
          </View>
          <Text style={styles.hint}>{t('photoCrop.hint')}</Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.useBtn} onPress={apply} disabled={working || !natural}>
            {working
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.useText}>{t('photoCrop.use')}</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/** Caption for the photo grids, so the gesture is discoverable at all. */
export function CropHint() {
  const { t } = useTranslation();
  return <Text style={styles.gridHint}>{t('photoCrop.gridHint')}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },

  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { overflow: 'hidden', borderRadius: 14, backgroundColor: '#1A1A1A' },
  hint:  { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 16, textAlign: 'center', paddingHorizontal: 32 },

  footer: { paddingHorizontal: 24, paddingBottom: 36 },
  useBtn: {
    backgroundColor: Colors.primary, borderRadius: 24,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  useText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  gridHint: { fontSize: 11, color: Colors.textSecondary, marginTop: 6 },
});
