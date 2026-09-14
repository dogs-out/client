import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/colors';

interface Props {
  visible: boolean;
  name: string;
  onClose: () => void;
  onReport: () => void;
  onHide: () => void;
}

/**
 * What you can do about someone you have not matched with.
 *
 * <p>A sheet rather than an Alert because the two actions want a sentence each:
 * hiding and reporting sound alike and do very different things, and the one
 * that emails a human should not be a one-word button.
 */
export function ProfileActionsSheet({ visible, name, onClose, onReport, onHide }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Stops a tap inside the sheet from closing it. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title} numberOfLines={1}>{name}</Text>

          <TouchableOpacity style={styles.action} onPress={onHide}>
            <View style={styles.iconWrap}>
              <Ionicons name="eye-off-outline" size={19} color={Colors.text} />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionLabel}>{t('discoverActions.hideTitle')}</Text>
              <Text style={styles.actionHint}>{t('discoverActions.hideHint')}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.action} onPress={onReport}>
            <View style={[styles.iconWrap, styles.iconWrapWarn]}>
              <Ionicons name="flag-outline" size={19} color={Colors.error} />
            </View>
            <View style={styles.actionBody}>
              <Text style={[styles.actionLabel, styles.actionLabelWarn]}>{t('discoverActions.reportTitle')}</Text>
              <Text style={styles.actionHint}>{t('discoverActions.reportHint')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,30,22,0.45)' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 18, paddingHorizontal: 20, paddingBottom: 28,
  },
  title: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10 },

  action: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  iconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(46,158,107,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapWarn: { backgroundColor: 'rgba(229,62,62,0.12)' },
  // flex so a long translation wraps instead of pushing anything off the edge.
  actionBody:  { flex: 1 },
  actionLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  actionLabelWarn: { color: Colors.error },
  actionHint:  { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },

  cancel: {
    marginTop: 14, paddingVertical: 13,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: Colors.text },
});
