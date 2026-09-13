import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Modal,
  StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import {
  GestureHandlerRootView, PanGestureHandler, PanGestureHandlerStateChangeEvent,
  PinchGestureHandler, PinchGestureHandlerStateChangeEvent, State,
} from 'react-native-gesture-handler';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/colors';
import { clampScale, maxOffset } from '../utils/pinch';

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
 * <p>Built on react-native-gesture-handler rather than PanResponder. The hand
 * rolled version read finger positions out of {@code nativeEvent.touches}, and on
 * the reporter's Android phone that never yielded a usable second touch: the
 * photo rendered and simply refused to move. A pinch handler is handed the scale
 * by the platform, so there is no touch array left to come up empty.
 *
 * <p>Deliberately the classic handler API with React Native's own Animated rather
 * than Reanimated worklets — this is two values and a clamp, and Reanimated would
 * mean a babel plugin and a companion package for it.
 */
export function PhotoCropModal({ uri, onCancel, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [working, setWorking] = useState(false);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);

  const frameW = width - 48;
  const frameH = frameW / FRAME_RATIO;

  // What is committed, and what the live gesture is adding on top of it.
  const committed = useRef({ scale: MIN_SCALE, x: 0, y: 0 });
  const scale = useRef(new Animated.Value(MIN_SCALE)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  /** Every photo starts unzoomed and centred, rather than holding the last one's framing. */
  useEffect(() => {
    if (!uri) return;
    setNatural(null);
    committed.current = { scale: MIN_SCALE, x: 0, y: 0 };
    scale.setValue(MIN_SCALE);
    translateX.setValue(0);
    translateY.setValue(0);
  }, [uri, scale, translateX, translateY]);

  /** Keeps the photo covering the frame, so no empty corner can ever be saved. */
  const settle = () => {
    const maxX = maxOffset(frameW, committed.current.scale);
    const maxY = maxOffset(frameH, committed.current.scale);
    committed.current.x = clampScale(committed.current.x, -maxX, maxX, 0);
    committed.current.y = clampScale(committed.current.y, -maxY, maxY, 0);
    scale.setValue(committed.current.scale);
    translateX.setValue(committed.current.x);
    translateY.setValue(committed.current.y);
  };

  const onPinch = Animated.event([{ nativeEvent: { scale } }], { useNativeDriver: true });

  const onPinchState = (e: PinchGestureHandlerStateChangeEvent) => {
    if (e.nativeEvent.oldState !== State.ACTIVE) return;
    // The handler reports a factor relative to the start of this pinch, so it
    // multiplies into what was already there rather than replacing it.
    committed.current.scale = clampScale(
      committed.current.scale * e.nativeEvent.scale, MIN_SCALE, MAX_SCALE, committed.current.scale);
    settle();
  };

  const onPan = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true });

  const onPanState = (e: PanGestureHandlerStateChangeEvent) => {
    if (e.nativeEvent.oldState !== State.ACTIVE) return;
    committed.current.x += e.nativeEvent.translationX;
    committed.current.y += e.nativeEvent.translationY;
    settle();
  };

  const apply = async () => {
    if (!uri || !natural) return;
    setWorking(true);
    try {
      // The frame shows the image scaled to cover it; translate that back into
      // pixels of the original, which is what the manipulator crops in.
      const cover = Math.max(frameW / natural.width, frameH / natural.height);
      const shown = cover * committed.current.scale;
      const cropW = Math.min(natural.width, frameW / shown);
      const cropH = Math.min(natural.height, frameH / shown);
      const originX = clampScale(
        (natural.width - cropW) / 2 - committed.current.x / shown, 0, natural.width - cropW, 0);
      const originY = clampScale(
        (natural.height - cropH) / 2 - committed.current.y / shown, 0, natural.height - cropH, 0);

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
      {/* A modal is its own native window, outside the root view in App.tsx, so
          the handlers inside it need a gesture root of their own. */}
      <GestureHandlerRootView style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('photoCrop.title')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.stage}>
          <PanGestureHandler
            onGestureEvent={onPan}
            onHandlerStateChange={onPanState}
            minPointers={1}
            maxPointers={1}
          >
            <Animated.View>
              <PinchGestureHandler onGestureEvent={onPinch} onHandlerStateChange={onPinchState}>
                <Animated.View style={[styles.frame, { width: frameW, height: frameH }]}>
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
                </Animated.View>
              </PinchGestureHandler>
            </Animated.View>
          </PanGestureHandler>

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
      </GestureHandlerRootView>
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
  hint:  { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 18, textAlign: 'center', paddingHorizontal: 32 },

  footer: { paddingHorizontal: 24, paddingBottom: 36 },
  useBtn: {
    backgroundColor: Colors.primary, borderRadius: 24,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  useText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  gridHint: { fontSize: 11, color: Colors.textSecondary, marginTop: 6 },
});
