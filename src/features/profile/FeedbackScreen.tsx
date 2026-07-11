import { useState } from 'react';
import {
  ActivityIndicator, Alert, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';
import { feedbackService } from '../../services/feedbackService';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Feedback'>;

export default function FeedbackScreen({ navigation }: Props) {
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      Alert.alert('Nothing to send', 'Please write your idea or feedback first.');
      return;
    }

    setSaving(true);
    try {
      await feedbackService.submit(trimmed);
      Alert.alert('Thanks!', 'Your feedback has been sent.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const msg: string = err?.response?.data?.message ?? err?.message ?? 'Something went wrong.';
      Alert.alert('Error', msg);
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
        <Text style={styles.headerTitle}>Send feedback</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          Got an idea, a wish, or something that bugged you? Let us know — it goes straight to the team.
        </Text>

        <GlassCard>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Type your idea or feedback…"
            placeholderTextColor={Colors.textSecondary}
            multiline
            maxLength={2000}
            textAlignVertical="top"
          />
        </GlassCard>

        <GlassButton onPress={submit} disabled={saving} tint="rgba(46,158,107,0.72)" style={styles.btn}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Send feedback</Text>
          }
        </GlassButton>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  scroll: { padding: 20, paddingTop: 12 },
  hint:   { fontSize: 13, color: Colors.textSecondary, marginBottom: 16, lineHeight: 19 },

  input: { minHeight: 140, fontSize: 15, color: Colors.text, lineHeight: 21 },

  btn:     { marginTop: 24 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
