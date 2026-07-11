import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
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

  return <Navigation />;
}
