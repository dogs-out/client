import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { REPORT_REASONS } from '../../services/moderationService';
import { Colors } from '../../constants/colors';
import { translateTag } from '../../i18n/translateTag';

interface Props {
  visible: boolean;
  name: string;
  onClose: () => void;
  onSubmit: (reason: string, message: string) => Promise<void>;
}

export function ReportUserModal({ visible, name, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setReason(null);
      setMessage('');
      setSubmitting(false);
      setError(null);
    }
  }, [visible]);

  const submit = () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError(null);
    onSubmit(reason, message.trim())
      .catch(() => {
        setError(t('chat.reportModal.sendFailed'));
        setSubmitting(false);
      });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdropWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.cardShadow}>
          <BlurView intensity={80} tint="light" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{t('chat.reportModal.title', { name })}</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.subtitle}>
                {t('chat.reportModal.subtitle', { name })}
              </Text>

              {REPORT_REASONS.map(r => {
                const selected = r === reason;
                return (
                  <TouchableOpacity key={r} style={styles.reasonRow} onPress={() => setReason(r)}>
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selected ? Colors.primary : Colors.textSecondary}
                    />
                    <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>{translateTag(r, t)}</Text>
                  </TouchableOpacity>
                );
              })}

              <TextInput
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder={t('chat.reportModal.messagePlaceholder')}
                placeholderTextColor={Colors.textSecondary}
                multiline
                maxLength={2000}
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.submitBtn, (!reason || submitting) && styles.submitBtnDisabled]}
                onPress={submit}
                disabled={!reason || submitting}
              >
                <Ionicons name="flag" size={16} color="#fff" />
                <Text style={styles.submitText}>{submitting ? t('chat.reportModal.sending') : t('chat.reportModal.sendReport')}</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  backdrop:     { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(13,40,24,0.45)' },

  cardShadow: {
    borderRadius: 28,
    shadowColor: Colors.text,
    shadowOffset: { width: 6, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 12,
  },
  card: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.glass.border,
  },
  cardInner: { backgroundColor: Colors.glass.overlay, padding: 20 },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title:    { fontSize: 19, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14, lineHeight: 18 },

  reasonRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  reasonText:         { fontSize: 15, color: Colors.text },
  reasonTextSelected: { fontWeight: '700', color: Colors.primary },

  input: {
    minHeight: 72, maxHeight: 140,
    backgroundColor: Colors.glass.inputBg,
    borderWidth: 1, borderColor: Colors.glass.inputBorder,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: Colors.text, textAlignVertical: 'top',
    marginTop: 10,
  },

  errorText: { color: Colors.error, fontSize: 13, marginTop: 10, textAlign: 'center' },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.error,
    borderRadius: 24, paddingVertical: 13, marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText:        { color: '#fff', fontSize: 15, fontWeight: '800' },
});
