import { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

/** Auth-style rounded password input with a show/hide (eye) toggle. */
export function PasswordInput(props: TextInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.wrap}>
      <TextInput
        placeholderTextColor={Colors.textSecondary}
        {...props}
        style={styles.input}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={styles.eye}
        onPress={() => setVisible(v => !v)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        testID="password-visibility-toggle"
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  input: {
    borderWidth: 1.5, borderColor: Colors.glass.inputBorder, borderRadius: 12,
    padding: 14, paddingRight: 46, fontSize: 16, color: Colors.text,
    backgroundColor: Colors.glass.inputBg, letterSpacing: 0,
  },
  eye: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
});
