import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Navigation from './src/app/Navigation';
import { initI18n } from './src/i18n';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => { initI18n().then(() => setReady(true)); }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    // Required by react-native-gesture-handler, and required at the very root:
    // without it gestures do nothing on Android, silently, which is the one
    // failure mode this library is being brought in to remove.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Navigation />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
