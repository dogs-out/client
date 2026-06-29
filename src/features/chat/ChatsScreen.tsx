import { StyleSheet, Text, View } from 'react-native';
import { FloatingBackground } from '../../components/FloatingBackground';
import { Colors } from '../../constants/colors';

export default function ChatsScreen() {
  return (
    <View style={styles.screen}>
      <FloatingBackground />
      <View style={styles.dimOverlay} />
      <Text style={styles.emoji}>💬</Text>
      <Text style={styles.title}>Chats</Text>
      <Text style={styles.subtitle}>Your matches will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  dimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(238,251,243,0.60)', pointerEvents: 'none' },
  emoji:      { fontSize: 56, marginBottom: 16 },
  title:      { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  subtitle:   { fontSize: 16, color: Colors.textSecondary },
});
