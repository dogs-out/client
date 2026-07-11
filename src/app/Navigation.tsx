import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AxiosError } from 'axios';
import { RootStackParamList } from '../types/navigation';
import { tokenStorage } from '../utils/tokenStorage';
import { userService } from '../services/userService';
import { notificationService } from '../services/notificationService';
import LoginScreen from '../features/auth/LoginScreen';
import RegisterScreen from '../features/auth/RegisterScreen';
import VerifyEmailScreen from '../features/auth/VerifyEmailScreen';
import ForgotPasswordScreen from '../features/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../features/auth/ResetPasswordScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import EditProfileScreen from '../features/profile/EditProfileScreen';
import SettingsScreen from '../features/profile/SettingsScreen';
import AddDogScreen from '../features/dogs/AddDogScreen';
import EditDogScreen from '../features/dogs/EditDogScreen';
import SwipePreviewScreen from '../features/dogs/SwipePreviewScreen';
import DiscoverFiltersScreen from '../features/matching/DiscoverFiltersScreen';
import ChangePasswordScreen from '../features/profile/ChangePasswordScreen';
import ChatDetailScreen from '../features/chat/ChatDetailScreen';
import UserProfileScreen from '../features/profile/UserProfileScreen';
import BlockedUsersScreen from '../features/profile/BlockedUsersScreen';
import NotificationSettingsScreen from '../features/profile/NotificationSettingsScreen';
import LocationSettingsScreen from '../features/profile/LocationSettingsScreen';
import HelpFaqScreen from '../features/profile/HelpFaqScreen';
import TermsPrivacyScreen from '../features/profile/TermsPrivacyScreen';
import AboutScreen from '../features/profile/AboutScreen';
import FeedbackScreen from '../features/profile/FeedbackScreen';
import LanguageScreen from '../features/profile/LanguageScreen';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function Navigation() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  // Tapping a push notification jumps straight to the relevant chat
  useEffect(() =>
    notificationService.onNotificationTap(data => {
      if (!navigationRef.isReady()) return;
      if (data.type === 'NEW_MESSAGE' && data.matchId && data.otherUserId) {
        navigationRef.navigate('ChatDetail', {
          matchId: data.matchId,
          otherUserId: data.otherUserId,
          name: data.name ?? 'Chat',
          profilePicture: null,
        });
      } else if (data.type === 'NEW_MATCH') {
        navigationRef.navigate('MainTabs', { screen: 'Chats' } as never);
      }
    }), []);

  useEffect(() => {
    const resolve = async () => {
      const token = await tokenStorage.get();
      if (!token) { setInitialRoute('Login'); return; }
      try {
        const user = await userService.getMe();
        setInitialRoute(user.dateOfBirth ? 'MainTabs' : 'ProfileSetup');
      } catch (e) {
        const status = e instanceof AxiosError ? e.response?.status : null;
        if (status === 401 || status === 403 || status === 404) {
          await tokenStorage.remove();
        }
        setInitialRoute('Login');
      }
    };
    resolve();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        {/* Auth */}
        <Stack.Screen name="Login"          component={LoginScreen} />
        <Stack.Screen name="Register"       component={RegisterScreen} />
        <Stack.Screen name="VerifyEmail"    component={VerifyEmailScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen} />
        <Stack.Screen name="ProfileSetup"   component={ProfileSetupScreen} />
        {/* Main app */}
        <Stack.Screen name="MainTabs"       component={TabNavigator} />
        {/* Modal/stack screens accessible from any tab */}
        <Stack.Screen name="EditProfile"    component={EditProfileScreen} />
        <Stack.Screen name="Settings"       component={SettingsScreen} />
        <Stack.Screen name="AddDog"         component={AddDogScreen} />
        <Stack.Screen name="EditDog"        component={EditDogScreen} />
        <Stack.Screen name="SwipePreview"      component={SwipePreviewScreen} />
        <Stack.Screen name="DiscoverFilters"    component={DiscoverFiltersScreen} />
        <Stack.Screen name="ChangePassword"     component={ChangePasswordScreen} />
        <Stack.Screen name="ChatDetail"         component={ChatDetailScreen} />
        <Stack.Screen name="UserProfile"        component={UserProfileScreen} />
        <Stack.Screen name="BlockedUsers"       component={BlockedUsersScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="LocationSettings"     component={LocationSettingsScreen} />
        <Stack.Screen name="HelpFaq"              component={HelpFaqScreen} />
        <Stack.Screen name="TermsPrivacy"         component={TermsPrivacyScreen} />
        <Stack.Screen name="About"                component={AboutScreen} />
        <Stack.Screen name="Feedback"              component={FeedbackScreen} />
        <Stack.Screen name="Language"               component={LanguageScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
