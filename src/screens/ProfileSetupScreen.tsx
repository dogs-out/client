import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

export default function ProfileSetupScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.subtitle}>Profile setup coming soon.</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
      >
        <Text style={styles.buttonText}>Continue to app</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, color: '#111' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
  button: { backgroundColor: '#111', padding: 16, paddingHorizontal: 32, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});