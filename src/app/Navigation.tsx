import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AxiosError } from 'axios';
import { RootStackParamList } from '../types/navigation';
import { tokenStorage } from '../utils/tokenStorage';
import { appPrefs } from '../utils/appPrefs';
import { signedInRoute } from '../utils/signedInRoute';
import { notificationService } from '../services/notificationService';
import LoginScreen from '../features/auth/LoginScreen';
import RegisterScreen from '../features/auth/RegisterScreen';
import VerifyEmailScreen from '../features/auth/VerifyEmailScreen';
import ForgotPasswordScreen from '../features/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../features/auth/ResetPasswordScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import AcceptTermsScreen from '../features/auth/AcceptTermsScreen';
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
import AppearanceSettingsScreen from '../features/profile/AppearanceSettingsScreen';
import PostSittingRequestScreen from '../features/sitter/PostSittingRequestScreen';
import RateSitterScreen from '../features/sitter/RateSitterScreen';
import SittingDetailsScreen from '../features/sitter/SittingDetailsScreen';
import SitterReviewsScreen from '../features/sitter/SitterReviewsScreen';
import HelpFaqScreen from '../features/profile/HelpFaqScreen';
import TermsPrivacyScreen from '../features/profile/TermsPrivacyScreen';
import AboutScreen from '../features/profile/AboutScreen';
import FeedbackScreen from '../features/profile/FeedbackScreen';
import LanguageScreen from '../features/profile/LanguageScreen';
import CreatePlaydateScreen from '../features/playdates/CreatePlaydateScreen';
import ParkPickerScreen from '../features/playdates/ParkPickerScreen';
import PlaydateDetailScreen from '../features/playdates/PlaydateDetailScreen';
import PlaydateChatScreen from '../features/playdates/PlaydateChatScreen';
import SetStatusScreen from '../features/playdates/SetStatusScreen';
import RaiseSosScreen from '../features/sos/RaiseSosScreen';
import SosDetailScreen from '../features/sos/SosDetailScreen';
import SheltersScreen from '../features/shelters/SheltersScreen';
import TourScreen from '../features/tour/TourScreen';
import { TourResumeBar } from '../features/tour/TourResumeBar';
import { tourProgress } from '../features/tour/tourProgress';
import TabNavigator from './TabNavigator';
import { BirthdayGreeting } from '../components/BirthdayGreeting';

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Where the tour's "continue" bar shows: the tabs and screens "Show me" opens. One
 * level further in — a single chat, say — it would sit on top of what is being read.
 */
const TOUR_BAR_ROUTES = new Set<string>([
  'Discover', 'FindSitter', 'Playdates', 'Chats', 'Profile', 'SetStatus', 'Shelters', 'AddDog',
]);

/** Screens before the app proper, where the foreground terms check has nothing to guard. */
const PRE_APP_ROUTES = new Set<string>([
  'Login', 'Register', 'VerifyEmail', 'ForgotPassword', 'ResetPassword', 'AcceptTerms',
]);

export default function Navigation() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);
  const [termsNext, setTermsNext] = useState<'MainTabs' | 'ProfileSetup'>('ProfileSetup');
  const [currentRoute, setCurrentRoute] = useState<string | undefined>();

  // Tapping a push notification jumps straight to the relevant chat
  useEffect(() =>
    notificationService.onNotificationTap(data => {
      if (!navigationRef.isReady()) return;
      // A birthday greeting or a walk invite is an invitation to write, so it
      // lands in the chat itself rather than on a list the user then has to search.
      // A sitting offer is a message with a button on it, so it opens the chat
      // like any other message would.
      const opensAChat = data.type === 'NEW_MESSAGE' || data.type === 'WALK_INVITE'
        || data.type === 'DOG_BIRTHDAY' || data.type === 'USER_BIRTHDAY'
        || data.type === 'SITTING_OFFER' || data.type === 'SITTING_DETAILS';
      if (opensAChat && data.matchId && data.otherUserId) {
        navigationRef.navigate('ChatDetail', {
          matchId: data.matchId,
          otherUserId: data.otherUserId,
          name: data.name ?? 'Chat',
          profilePicture: null,
        });
      } else if (data.type === 'NEW_MATCH') {
        navigationRef.navigate('MainTabs', { screen: 'Chats' } as never);
      } else if (data.type === 'PLAYDATE_MESSAGE' && data.playdateId) {
        navigationRef.navigate('PlaydateChat', { playdateId: data.playdateId, title: '' });
      } else if (data.type?.startsWith('PLAYDATE') && data.playdateId) {
        navigationRef.navigate('PlaydateDetail', { playdateId: data.playdateId });
      } else if (data.type === 'SITTING_REVIEWED' && data.sitterId) {
        // Straight to the review itself — being told one exists and then having
        // to go looking for it is most of the annoyance of being told. sitterId,
        // not otherUserId: they are being sent to read about themselves, and
        // otherUserId is whoever wrote it.
        navigationRef.navigate('SitterReviews', {
          sitterId: data.sitterId,
          name: data.name ?? '',
        });
      } else if ((data.type === 'SOS_ALERT' || data.type === 'SOS_FOUND') && data.alertId) {
        navigationRef.navigate('SosDetail', { alertId: Number(data.alertId) });
      } else if (data.type === 'SITTING_RATE' || data.type === 'SITTING_ACCEPTED'
        || data.type === 'SITTING_CANCELLED' || data.type === 'SITTING_BLOCKED') {
        // The rating screen needs the whole job, and a push carries only ids —
        // so this lands on the dogsitting tab, where the job wears a Rate button.
        // "FindSitter" is the route; "Dogsitting" is only what the tab is labelled.
        navigationRef.navigate('MainTabs', { screen: 'FindSitter' } as never);
      }
    }), []);

  // Device preferences before the first screen paints, so the background does not
  // start animating and then stop for someone who asked it not to.
  useEffect(() => { appPrefs.load(); }, []);

  useEffect(() => {
    const resolve = async () => {
      const token = await tokenStorage.get();
      if (!token) { setInitialRoute('Login'); return; }
      try {
        const route = await signedInRoute();
        if (route.name === 'AcceptTerms') setTermsNext(route.params.next);
        setInitialRoute(route.name);
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

  // Most "opening the app" on a phone is resuming it, not a cold start, so the
  // terms are re-checked every time the app comes back to the foreground. Someone
  // who has not accepted them lands on the gate the next time they open it.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async state => {
      if (state !== 'active' || !navigationRef.isReady()) return;
      const current = navigationRef.getCurrentRoute()?.name;
      if (!current || PRE_APP_ROUTES.has(current)) return;
      if (!(await tokenStorage.get())) return;
      try {
        const route = await signedInRoute();
        if (route.name === 'AcceptTerms') navigationRef.reset({ index: 0, routes: [route] });
      } catch {
        // Offline or a failed request: try again on the next foreground.
      }
    });
    return () => sub.remove();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setCurrentRoute(navigationRef.getCurrentRoute()?.name)}
      onStateChange={() => setCurrentRoute(navigationRef.getCurrentRoute()?.name)}
    >
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          // iOS 26 dims the area above scroll views by default ("scroll edge
          // effect") — reads as a grey band over our custom headers/cards.
          scrollEdgeEffects: { top: 'hidden' },
        }}
      >
        {/* Auth */}
        <Stack.Screen name="Login"          component={LoginScreen} />
        <Stack.Screen name="Register"       component={RegisterScreen} />
        <Stack.Screen name="VerifyEmail"    component={VerifyEmailScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen} />
        <Stack.Screen
          name="AcceptTerms"
          component={AcceptTermsScreen}
          initialParams={{ next: termsNext }}
          options={{ gestureEnabled: false }}
        />
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
        <Stack.Screen name="AppearanceSettings"   component={AppearanceSettingsScreen} />
        <Stack.Screen name="PostSittingRequest"   component={PostSittingRequestScreen} />
        <Stack.Screen name="RateSitter"           component={RateSitterScreen} />
        <Stack.Screen name="SittingDetails"       component={SittingDetailsScreen} />
        <Stack.Screen name="SitterReviews"        component={SitterReviewsScreen} />
        <Stack.Screen name="HelpFaq"              component={HelpFaqScreen} />
        <Stack.Screen name="TermsPrivacy"         component={TermsPrivacyScreen} />
        <Stack.Screen name="About"                component={AboutScreen} />
        <Stack.Screen name="Feedback"              component={FeedbackScreen} />
        <Stack.Screen name="Language"               component={LanguageScreen} />
        <Stack.Screen name="CreatePlaydate"         component={CreatePlaydateScreen} />
        <Stack.Screen name="ParkPicker"             component={ParkPickerScreen} />
        <Stack.Screen name="PlaydateDetail"         component={PlaydateDetailScreen} />
        <Stack.Screen name="PlaydateChat"           component={PlaydateChatScreen} />
        <Stack.Screen name="SetStatus"              component={SetStatusScreen} />
        <Stack.Screen name="RaiseSos"               component={RaiseSosScreen} />
        <Stack.Screen name="SosDetail"              component={SosDetailScreen} />
        <Stack.Screen name="Shelters"               component={SheltersScreen} />
        <Stack.Screen
          name="Tour"
          component={TourScreen}
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
      </Stack.Navigator>
      {/* Above the navigator, so the greeting finds the user on whatever screen
          they opened the app to. */}
      <BirthdayGreeting />
      <TourResumeBar
        visible={!!currentRoute && TOUR_BAR_ROUTES.has(currentRoute)}
        raised={currentRoute === 'Discover'}
        onContinue={startAt => {
          tourProgress.clear();
          navigationRef.navigate('Tour', { startAt });
        }}
      />
    </NavigationContainer>
  );
}
