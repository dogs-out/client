import { Platform } from 'react-native';

/**
 * How KeyboardAvoidingView should move content out from under the keyboard.
 *
 * <p>Padding on iOS, and nothing at all on Android. Android already resizes the
 * window when the keyboard appears, so adding padding on top of that counts the
 * keyboard twice — and worse, the padding is measured once when the keyboard
 * opens and does not follow it. Opening the emoji panel, which is taller than
 * the keyboard, therefore hid the message being written behind it.
 *
 * <p>Undefined is a real value here, not an oversight: it tells
 * KeyboardAvoidingView to leave the layout alone and let the window resize do
 * the work, which tracks whatever height the input method actually takes.
 */
export const KEYBOARD_BEHAVIOR = Platform.OS === 'ios' ? 'padding' : undefined;
