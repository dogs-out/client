import { RefObject, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';
import { userService } from '../../services/userService';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;

function PasswordField({ label, value, onChange, onSubmit, returnKeyType = 'next', inputRef }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  returnKeyType?: 'next' | 'done';
  inputRef?: RefObject<TextInput | null>;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.inputRow}>
        <TextInput
          ref={inputRef}
          style={fieldStyles.input}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmit}
          placeholderTextColor={Colors.textSecondary}
          placeholder="••••••••"
        />
        <TouchableOpacity onPress={() => setVisible(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap:     { marginBottom: 4 },
  label:    { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 8 },
  input:    { flex: 1, fontSize: 16, color: Colors.text, paddingVertical: 4 },
});

export default function ChangePasswordScreen({ navigation }: Props) {
  const [current, setCurrent]   = useState('');
  const [next, setNext]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [saving, setSaving]     = useState(false);

  const nextRef    = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const submit = async () => {
    if (!current || !next || !confirm) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (next.length < 8) {
      Alert.alert('Password too short', 'New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      Alert.alert('Passwords do not match', 'New password and confirmation do not match.');
      return;
    }
    if (next === current) {
      Alert.alert('Same password', 'New password must be different from your current password.');
      return;
    }

    setSaving(true);
    try {
      await userService.changePassword(current, next);
      Alert.alert('Password changed', 'Your password has been updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const msg: string = err?.response?.data?.message ?? err?.message ?? 'Something went wrong.';
      if (msg.toLowerCase().includes('incorrect')) {
        Alert.alert('Wrong password', 'Your current password is incorrect.');
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change password</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <GlassCard>
          <PasswordField
            label="Current password"
            value={current}
            onChange={setCurrent}
            onSubmit={() => nextRef.current?.focus()}
          />
          <View style={styles.divider} />
          <PasswordField
            label="New password"
            value={next}
            onChange={setNext}
            onSubmit={() => confirmRef.current?.focus()}
            inputRef={nextRef}
          />
          <View style={styles.divider} />
          <PasswordField
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            onSubmit={submit}
            returnKeyType="done"
            inputRef={confirmRef}
          />
        </GlassCard>

        <Text style={styles.hint}>Password must be at least 8 characters.</Text>

        <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={submit} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Update password</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  scroll:  { padding: 20, paddingTop: 12 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },
  hint:    { fontSize: 13, color: Colors.textSecondary, marginTop: 12, marginLeft: 4 },

  btn:         { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
