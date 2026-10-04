/**
 * How KeyboardAvoidingView should move content out from under the keyboard.
 *
 * <p>Padding on both platforms, with KeyboardAvoidingView taken from
 * react-native-keyboard-controller rather than React Native. Android used to be
 * left to resize the window on its own, but since the app draws edge-to-edge
 * (enforced from Expo SDK 57) Android no longer resizes it, and the keyboard
 * covered the message being written. React Native's own padding was no answer
 * either: it measured the keyboard once, so the taller emoji panel still hid the
 * input. The controller's version follows the keyboard frame as it changes.
 */
export const KEYBOARD_BEHAVIOR = 'padding' as const;
