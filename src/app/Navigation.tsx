import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { tokenStorage } from '../utils/tokenStorage';
import LoginScreen from '../features/auth/LoginScreen';
import RegisterScreen from '../features/auth/RegisterScreen';
import VerifyEmailScreen from '../features/auth/VerifyEmailScreen';
import ForgotPasswordScreen from '../features/auth/ForgotPasswordScreen';
import GoogleOAuthScreen from '../features/auth/GoogleOAuthScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    tokenStorage.get().then(token => {
      setInitialRoute(token ? 'Home' : 'Login');
    });
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="GoogleOAuth" component={GoogleOAuthScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}